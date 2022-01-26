var app;

/*!
 * swiped-events.js - v1.1.6
 * Pure JavaScript swipe events
 * https://github.com/john-doherty/swiped-events
 * @inspiration https://stackoverflow.com/questions/16348031/disable-scrolling-when-touch-moving-certain-element
 * @author John Doherty <www.johndoherty.info>
 * @license MIT
 */
!function(t,e){"use strict";"function"!=typeof t.CustomEvent&&(t.CustomEvent=function(t,n){n=n||{bubbles:!1,cancelable:!1,detail:void 0};var a=e.createEvent("CustomEvent");return a.initCustomEvent(t,n.bubbles,n.cancelable,n.detail),a},t.CustomEvent.prototype=t.Event.prototype),e.addEventListener("touchstart",function(t){if("true"===t.target.getAttribute("data-swipe-ignore"))return;s=t.target,r=Date.now(),n=t.touches[0].clientX,a=t.touches[0].clientY,u=0,i=0},!1),e.addEventListener("touchmove",function(t){if(!n||!a)return;var e=t.touches[0].clientX,r=t.touches[0].clientY;u=n-e,i=a-r},!1),e.addEventListener("touchend",function(t){if(s!==t.target)return;var e=parseInt(l(s,"data-swipe-threshold","20"),10),o=parseInt(l(s,"data-swipe-timeout","500"),10),c=Date.now()-r,d="",p=t.changedTouches||t.touches||[];Math.abs(u)>Math.abs(i)?Math.abs(u)>e&&c<o&&(d=u>0?"swiped-left":"swiped-right"):Math.abs(i)>e&&c<o&&(d=i>0?"swiped-up":"swiped-down");if(""!==d){var b={dir:d.replace(/swiped-/,""),touchType:(p[0]||{}).touchType||"direct",xStart:parseInt(n,10),xEnd:parseInt((p[0]||{}).clientX||-1,10),yStart:parseInt(a,10),yEnd:parseInt((p[0]||{}).clientY||-1,10)};s.dispatchEvent(new CustomEvent("swiped",{bubbles:!0,cancelable:!0,detail:b})),s.dispatchEvent(new CustomEvent(d,{bubbles:!0,cancelable:!0,detail:b}))}n=null,a=null,r=null},!1);var n=null,a=null,u=null,i=null,r=null,s=null;function l(t,n,a){for(;t&&t!==e.documentElement;){var u=t.getAttribute(n);if(u)return u;t=t.parentNode}return a}}(window,document);


function Application(){

	this.objects = {};
	this.settings = {'astronomical':false,'nautical':false};

	var dateControl = document.querySelector('input[type="date"]');

	// Constants
	var d2r = Math.PI/180;
	var r2d = 180.0/Math.PI;

	// The Julian Date of the Unix Time epoch is 2440587.5
	function getJD(clock){
		return (clock.toMillis()/86400000.0) + 2440587.5;
	};

	this.setGeo = function(lat,lon,tz,name){
		this.latitude = {'deg':lat,'rad':lat*d2r};
		this.longitude = {'deg':lon,'rad':lon*d2r};
		this.tz = (tz||undefined);
		if(name) S('#typeahead')[0].value = name;
		this.setDate();
		return this;
	}

	this.getPositions = function(objects){
		var c,o;
		var now = new Date();
		var days = 1;
		var radec,azel;

		for(obj in objects){
			if(obj=="sun"){
				this.objects[obj] = sunPosition(this.times.JD);
				c = this.ecliptic2azel(this.objects[obj].lon*d2r,this.objects[obj].lat*d2r,this.times.LST);
				this.objects[obj].az = c.az;
				this.objects[obj].el = c.el;
			}else if(obj=="moon"){
				this.objects[obj] = moonPosition(this.times.JD,this.objects.sun);
				//this.objects[obj].phase = moonPhase(this.times.JD);
				c = this.ecliptic2azel(this.objects[obj].lon*d2r,this.objects[obj].lat*d2r,this.times.LST);
				this.objects[obj].az = c.az;
				this.objects[obj].el = c.el;
			}else{
				// See if this is in the planets array
				if(typeof objects[obj].id==="number"){
					radec = this.planets.getEphem(objects[obj].id,this.times.JD);
					azel = this.coord2horizon(radec[0]*d2r,radec[1]*d2r)
					this.objects[obj] = {'az':azel[1]*r2d,'el':azel[0]*r2d};
				}
			}
		}
		return this.objects;
	}

	// Find the Julian Date, Local Sidereal Time and Greenwich Sidereal Time
	this.setClock = function(clock){
		this.clock = clock;
		lon = (this.longitude.deg||0);

		var JD,JD0,S,T,T0,UT,A,GST,d,LST;
		JD = getJD(this.clock);
		UTC = this.clock.toUTC();
		JD0 = Math.floor(JD-0.5)+0.5;
		S = JD0-2451545.0;
		T = S/36525.0;
		T0 = (6.697374558 + (2400.051336*T) + (0.000025862*T*T))%24;
		if(T0 < 0) T0 += 24;
		UT = (((UTC.millisecond/1000 + UTC.second)/60) + UTC.minute)/60 + UTC.hour;
		A = UT*1.002737909;
		T0 += A;
		GST = T0%24;
		if(GST < 0) GST += 24;
		d = (GST + lon/15.0)/24.0;
		d = d - Math.floor(d);
		if(d < 0) d += 1;
		LST = 24.0*d;
		this.times = { GST:GST, LST:LST, JD:JD, meanObliquity: meanObliquity(JD) };
		return this;
	};

	// Uses algorithm defined in Practical Astronomy (4th ed) by Peter Duffet-Smith and Jonathan Zwart
	function moonPosition(JD,sun){
		var lo,Po,No,i,e,l,Mm,N,C,Ev,sinMo,Ae,A3,Mprimem,Ec,A4,lprime,V,lprimeprime,Nprime,lppNp,sinlppNp,y,x,lm,Bm;
		lo = 91.929336;	// Moon's mean longitude at epoch 2010.0
		Po = 130.143076;	// mean longitude of the perigee at epoch
		No = 291.682547;	// mean longitude of the node at the epoch
		i = 5.145396;	// inclination of Moon's orbit
		e = 0.0549;	// eccentricity of the Moon's orbit
		l = (13.1763966*sun.D + lo)%360;
		if(l < 0) l += 360;
		Mm = (l - 0.1114041*sun.D - Po)%360;
		if(Mm < 0) Mm += 360;
		N = (No - 0.0529539*sun.D)%360;
		if(N < 0) N += 360;
		C = l-sun.lon;
		Ev = 1.2739*Math.sin((2*C-Mm)*d2r);
		sinMo = Math.sin(sun.Mo*d2r);
		Ae = 0.1858*sinMo;
		A3 = 0.37*sinMo;
		Mprimem = Mm + Ev -Ae - A3;
		Ec = 6.2886*Math.sin(Mprimem*d2r);
		A4 = 0.214*Math.sin(2*Mprimem*d2r);
		lprime = l + Ev + Ec -Ae + A4;
		V = 0.6583*Math.sin(2*(lprime-sun.lon)*d2r);
		lprimeprime = lprime + V;
		Nprime = N - 0.16*sinMo;
		lppNp = (lprimeprime-Nprime)*d2r;
		sinlppNp = Math.sin(lppNp);
		y = sinlppNp*Math.cos(i*d2r);
		x = Math.cos(lppNp);
		lm = Math.atan2(y,x)/d2r + Nprime;
		Bm = Math.asin(sinlppNp*Math.sin(i*d2r))/d2r;
		if(lm > 360) lm -= 360;
		return { lon:lm,lat:Bm };
	};
	
	// moonPhase(Julian Date);
	function moonPhase(JDnow){

		var Epoch = 2447891.5;

		// here is where the previous calculations start
		// note the new way of calculating D -- the answer is the same
		D = JDnow - Epoch;                      // find diff from 31 Dec 1989
		var n = D * (360 / 365.242191);                         //no 46-3
		if(n > 0) n = n - Math.floor(Math.abs(n / 360)) * 360;    //no 46-3
		else n = n + (360 + Math.floor(Math.abs(n / 360)) * 360);  //no 46-3

		var Mo = n + 279.403303 - 282.768422;                   //no 46-4;
		if(Mo < 0) { Mo = Mo + 360 }                            //no 46-4
		var Ec = 360 * .016713 * Math.sin(Mo * 3.141592654 / 180) / 3.141592654;        //no 46-5
		var lamda = n + Ec + 279.403303;                        //no 46-6
		if(lamda > 360) { lamda = lamda - 360 }                 //no 46-6
		var l = 13.1763966 * D + 318.351648;                    //no 65-4
		if (l > 0) {
			l = l - Math.floor(Math.abs(l / 360)) * 360;  //no 65-4
		} else {
			l = l + (360 + Math.floor(Math.abs(l / 360)) * 360);  //no 65-4
		}
		var Mm = l - .1114041 * D - 36.34041;                   //no 65-5
		if (Mm > 0) {
			Mm = Mm - Math.floor(Math.abs(Mm / 360)) * 360;                       //no 65-5
		} else {
			Mm = Mm + (360 + Math.floor(Math.abs(Mm / 360)) * 360);                       //no 65-5
		}
		var N65 = 318.510107 - .0529539 * D;                    //no 65-6
		if (N65 > 0) {
			N65 = N65 - Math.floor(Math.abs(N65 / 360)) * 360;                    //no 65-6
		} else {
			N65 = N65 + (360 + Math.floor(Math.abs(N65 / 360)) * 360);                    //no 65-6
		}
		var Ev = 1.2739 * Math.sin((2 * (l - lamda) - Mm) * 3.141592654 / 180);         //no 65-7
		var Ae = .1858 * Math.sin(Mo * 3.141592654 / 180);      //no 65-8
		var A3 = .37 * Math.sin(Mo * 3.141592654 / 180);        //no 65-8
		var Mmp = Mm + Ev - Ae - A3;                            //no 65-9
		var Ec = 6.2886 * Math.sin(Mmp * 3.141592654 / 180);    //no 65-10
		var A4 = .214 * Math.sin((2 * Mmp) * 3.141592654 / 180);                        //no 65-11
		var lp = l + Ev + Ec - Ae + A4;                         //no 65-12
		var V = .6583 * Math.sin((2 * (lp - lamda)) * 3.141592654 / 180);               //no 65-13
		var lpp = lp + V;                                       //no 65-14
		var D67 = lpp - lamda;                                  //no 67-2
		return .5 * (1 - Math.cos(D67 * 3.141592654 / 180));      //no 67-3
	}

	// Uses algorithm defined in Practical Astronomy (4th ed) by Peter Duffet-Smith and Jonathan Zwart
	function sunPosition(JD){
		var D,eg,wg,e,N,Mo,v,lon,lat;
		D = (JD-2455196.5);	// Number of days since the epoch of 2010 January 0.0
		// Calculated for epoch 2010.0. If T is the number of Julian centuries since 1900 January 0.5 = (JD-2415020.0)/36525
		eg = 279.557208;	// mean ecliptic longitude in degrees = (279.6966778 + 36000.76892*T + 0.0003025*T*T)%360;
		wg = 283.112438;	// longitude of the Sun at perigee in degrees = 281.2208444 + 1.719175*T + 0.000452778*T*T;
		e = 0.016705;	// eccentricity of the Sun-Earth orbit in degrees = 0.01675104 - 0.0000418*T - 0.000000126*T*T;
		N = ((360/365.242191)*D)%360;
		if(N < 0) N += 360;
		Mo = (N + eg - wg)%360;	// mean anomaly in degrees
		if(Mo < 0) Mo += 360;
		v = Mo + (360/Math.PI)*e*Math.sin(Mo*Math.PI/180);
		lon = v + wg;
		if(lon > 360) lon -= 360;
		lat = 0;
		return {lat:lat,lon:lon,Mo:Mo,D:D,N:N};
	};

	// Input is Julian Date
	// Uses method defined in Practical Astronomy (4th ed) by Peter Duffet-Smith and Jonathan Zwart
	function meanObliquity(JD){
		var T,T2,T3;
		T = (JD-2451545.0)/36525;	// centuries since 2451545.0 (2000 January 1.5)
		T2 = T*T;
		T3 = T2*T;
		return (23.4392917 - 0.0130041667*T - 0.00000016667*T2 + 0.0000005027778*T3)*d2r;
	};

	// Take input in radians, decimal Sidereal Time and decimal latitude
	// Uses method defined in Practical Astronomy (4th ed) by Peter Duffet-Smith and Jonathan Zwart
	this.ecliptic2azel = function(l,b,LST){
		var now = new Date();
		var sl,cl,sb,cb,v,e,ce,se,Cprime,s,ST,cST,sST,B,r,sphi,cphi,A,w,theta,psi,lat;
		lat = this.latitude.rad;
		sl = Math.sin(l);
		cl = Math.cos(l);
		sb = Math.sin(b);
		cb = Math.cos(b);
		v = [cl*cb,sl*cb,sb];
		e = this.times.meanObliquity;
		ce = Math.cos(e);
		se = Math.sin(e);
		Cprime = [[1.0,0.0,0.0],[0.0,ce,-se],[0.0,se,ce]];
		s = this.vectorMultiply(Cprime,v);
		ST = LST*15*d2r;
		cST = Math.cos(ST);
		sST = Math.sin(ST);
		B = [[cST,sST,0],[sST,-cST,0],[0,0,1]];
		r = this.vectorMultiply(B,s);
		sphi = Math.sin(lat);
		cphi = Math.cos(lat);
		A = [[-sphi,0,cphi],[0,-1,0],[cphi,0,sphi]];
		w = this.vectorMultiply(A,r);
		theta = Math.atan2(w[1],w[0]);
		psi = Math.asin(w[2]);
		delta = (new Date() - now);
		return {az:theta*r2d,el:psi*r2d};
	};

	this.vectorMultiply = function(A,B){
		if(B.length > 0){
			// 2D (3x3)x(3x3) or 1D (3x3)x(3x1)
			if(B[0].length > 0) return [[(A[0][0]*B[0][0]+A[0][1]*B[1][0]+A[0][2]*B[2][0]),(A[0][0]*B[0][1]+A[0][1]*B[1][1]+A[0][2]*B[2][1]),(A[0][0]*B[0][2]+A[0][1]*B[1][2]+A[0][2]*B[2][2])],
										[(A[1][0]*B[0][0]+A[1][1]*B[1][0]+A[1][2]*B[2][0]),(A[1][0]*B[0][1]+A[1][1]*B[1][1]+A[1][2]*B[2][1]),(A[1][0]*B[0][2]+A[1][1]*B[1][2]+A[1][2]*B[2][2])],
										[(A[2][0]*B[0][0]+A[2][1]*B[1][0]+A[2][2]*B[2][0]),(A[2][0]*B[0][1]+A[2][1]*B[1][1]+A[2][2]*B[2][1]),(A[2][0]*B[0][2]+A[2][1]*B[1][2]+A[2][2]*B[2][2])]];
			else return [(A[0][0]*B[0] + A[0][1]*B[1] + A[0][2]*B[2]),(A[1][0]*B[0] + A[1][1]*B[1] + A[1][2]*B[2]),(A[2][0]*B[0] + A[2][1]*B[1] + A[2][2]*B[2])];
		}
	};
	
	this.coord2horizon = function(ra, dec){
		var ha, alt, az, sd, sl, cl;
		// compute hour angle in degrees
		ha = (Math.PI*this.times.LST/12) - ra;
		sd = Math.sin(dec);
		sl = Math.sin(this.latitude.rad);
		cl = Math.cos(this.latitude.rad);
		// compute altitude in radians
		alt = Math.asin(sd*sl + Math.cos(dec)*cl*Math.cos(ha));
		// compute azimuth in radians
		// divide by zero error at poles or if alt = 90 deg (so we should've already limited to 89.9999)
		az = Math.acos((sd - Math.sin(alt)*sl)/(Math.cos(alt)*cl));
		// choose hemisphere
		if (Math.sin(ha) > 0) az = 2*Math.PI - az;
		return [alt,az];
	};

	var _obj = this;


	/* Add events */
	S(dateControl).on('change',{me:this},function(e){
		e.data.me.setDate(e.currentTarget.value);
	});
	// Add keypress
	S(document).on('keyup',{'me':this},function(e){
		var d;
		if(e.originalEvent.keyCode==37) e.data.me.nextDay(-1);
		else if(e.originalEvent.keyCode==39) e.data.me.nextDay(1);
	});
	// Add swipe controls
	document.addEventListener('swiped-left', function(e){
		_obj.nextDay(1)
	});
	document.addEventListener('swiped-right', function(e){
		_obj.nextDay(-1)
	});
	this.nextDay = function(dir){
		var d;
		if(dir < 0){
			d = new Date(dateControl.value);
			d.setHours(12);
			d.setDate(d.getDate() - 1);
			this.setDate(d.toISOString().substr(0,10));
		}else{
			d = new Date(dateControl.value);
			d.setHours(12);
			d.setDate(d.getDate() + 1);
			this.setDate(d.toISOString().substr(0,10));
		}
		return this;
	};
	
	// Deal with resize
	this.resize = function(){
		this.setDate(dateControl.value);
		return this;
	}
	window.onresize = function(event){ _obj.resize(); };

	// Get geolocation
	if("geolocation" in navigator){

		S('#btn-location').on('click',{me:this},function(e){
			e.preventDefault();
			// Get the user location
			navigator.geolocation.getCurrentPosition(function(position) {
				_obj.setGeo(position.coords.latitude,position.coords.longitude);
				S('#typeahead')[0].value = position.coords.latitude.toFixed(1)+', '+position.coords.longitude.toFixed(1);
			},function(){
				console.error("Sorry, no position available.");
			},{
				enableHighAccuracy: true, 
				maximumAge        : 0,
				timeout           : 5000
			});
		});
	}

	this.setDate = function(t){

		var now,iso;

		if(!dateControl){
			console.error('No date control defined');
			return this;
		}

		// Get default value from the dateControl
		if(!t && dateControl) t = dateControl.value;
		now = new Date();
		// If no time is yet set use the current time
		if(!t) t = now;
		// If the time is provided as a string try to parse it
		if(typeof t==="string") t = new Date(t);

		// Get the ISO date
		iso = t.toISOString().substr(0,10);
		
		// Set the dateControl
		dateControl.value = iso.substr(0,10);

		// We've set the clock in the locale timezone but we want to calculate a day in the destination timezone
		var dt = luxon.DateTime.fromISO(iso+'T00:00Z');
		if(this.tz) dt = dt.setZone(this.tz);
		// Set clock to start of the day in the appropriate timezone
		clock = dt.startOf('day');

		var tall = 240;
		var wide = 0;

		if(!this.paper) this.paper = new SVG('sky',wide,tall);

		// Reset size of svg
		this.paper.clear();
		wide = Math.floor(S('#sky')[0].offsetWidth);
		this.paper.paper.attr('width',wide).attr('viewBox','0 0 '+wide+' '+tall);

		var objects = {
			'sun':{'path':[],'colour':'#eebd14','elevation':[],'rise':'Sunrise','set':'Sunset','icon':'sun.svg'},
			'moon':{'path':[],'colour':'#999','elevation':[],'rise':'Moonrise','set':'Moonset','icon':'moon.svg'}
		}
		this.planets = new Planets();
		for(i = 0; i < this.planets.planets.length; i++){
			if(this.planets.planets[i].colour && this.planets.planets[i].include){
				objects[this.planets.planets[i].name] = {'path':[],'colour':this.planets.planets[i].colour,'elevation':[],'id':i,'rise':this.planets.planets[i].name+' rise','set':this.planets.planets[i].name+' set'};
			}
		}

		var list = [];

		function getCoords(m,el){ return [m*wide/1440,tall/2 - el*tall/180]; }

		xy = getCoords(40,0);
		this.paper.path([['M',getCoords(0,0)],['L',getCoords(1440,0)]]).attr({'stroke':'black','fill':'rgba(0,0,0,0.3)'});	// ,['L',getCoords(1440,-90)],['L',getCoords(0,-90)],['Z',[]]
	
		var oldpos;
		for(var i = 0; i < 24*60; i++){
			clock = clock.plus({minutes: 1});
			// Set the clock parameters (re-calculates astronomical values)
			app.setClock(clock);
			pos = app.getPositions(objects);
			for(var o in objects){
				if(pos[o]){
					objects[o].elevation.push({'time':clock,'el':pos[o].el});
					objects[o].path.push([(i==0 ? 'M':'L'),getCoords(i,pos[o].el)]);
				}
			}
			oldpos = pos;
		}

		sunsize = 0.5;
		sunrad = sunsize/2;
		
		stop1 = 0;
		stop2 = 0;
		stop3 = 0;
		stop4 = 100;
		stop5 = 100;
		stop6 = 100;

		for(var o in objects){
			if(objects[o].elevation.length > 0){
				prevel = objects[o].elevation[0].el;
				objects[o].list = [];
				for(var i = 1; i < objects[o].elevation.length; i++){
					ob = objects[o].elevation[i];
					el = ob.el;
					if(el >= 0-sunrad && prevel < 0-sunrad) list.push({'title':objects[o].rise,'values':ob,'colour':objects[o].colour,'type':o,'icon':objects[o].icon});
					if(el <= 0-sunrad && prevel > 0-sunrad) list.push({'title':objects[o].set,'values':ob,'colour':objects[o].colour,'type':o,'icon':objects[o].icon});
					if(o == "sun"){
						if(el >= 0-sunrad && prevel < 0-sunrad){
							// Sunrise
							stop3 = (ob.time.ts-objects['sun'].elevation[0].time.ts)/864000;
						}
						if(el <= 0-sunrad && prevel > 0-sunrad){
							// Sunset
							stop4 = (ob.time.ts-objects['sun'].elevation[0].time.ts)/864000;
						}
						if(el >= -6-sunrad && prevel < -6-sunrad){
							list.push({'title':'First light','values':ob,'colour':objects[o].colour,'type':o,'icon':objects[o].icon});
							stop2 = (ob.time.ts-objects['sun'].elevation[0].time.ts)/864000;
						}
						if(el <= -6-sunrad && prevel > -6-sunrad){
							list.push({'title':'Last light','values':ob,'colour':objects[o].colour,'type':o,'icon':objects[o].icon});
							stop5 = (ob.time.ts-objects['sun'].elevation[0].time.ts)/864000;
						}
						if(el >= -12-sunrad && prevel < -12-sunrad){
							if(this.settings.nautical) list.push({'title':'Nautical dawn','values':ob,'colour':objects[o].colour,'type':o,'icon':objects[o].icon});
						}
						if(el <= -12-sunrad && prevel > -12-sunrad){
							if(this.settings.nautical) list.push({'title':'Nautical dusk','values':ob,'colour':objects[o].colour,'type':o,'icon':objects[o].icon});
						}
						if(el >= -18-sunrad && prevel < -18-sunrad){
							if(this.settings.astronomical) list.push({'title':'Astronomical dawn','values':ob,'colour':objects[o].colour,'icon':objects[o].icon});
							stop1 = (ob.time.ts-objects['sun'].elevation[0].time.ts)/864000;
						}
						if(el <= -18-sunrad && prevel > -18-sunrad){
							if(this.settings.astronomical) list.push({'title':'Astronomical dusk','values':ob,'colour':objects[o].colour,'icon':objects[o].icon});
							stop6 = (ob.time.ts-objects['sun'].elevation[0].time.ts)/864000;
						}
					}
					prevel = el;
				}
				this.paper.path(objects[o].path).attr({'stroke':objects[o].colour,'stroke-width':2,'stroke-dasharray':'10 2','fill':'none'});
			}
		}
		if(stop5 < 50) stop5 += 100;
		if(stop6 < 50) stop6 += 100;

		for(var i = 0; i < list.length; i++){
			if(list[i].values){
				list[i].value = list[i].values.time.toISO().substr(11,5);
				// Get the hour in the user's timezone
				list[i].user = list[i].values.time.setZone('local').toISO().substr(11,5);
			}
		}

		// Update day-night gradient
		S('#sky svg').css({'background-image':'linear-gradient(to right, rgba(0,0,0,0.8) '+stop1.toFixed(1)+'%, rgba(0,0,0,0.3) '+stop2.toFixed(1)+'%, rgba(0,0,0,0) '+stop3.toFixed(1)+'%, rgba(0,0,0,0) '+stop4.toFixed(1)+'%, rgba(0,0,0,0.3) '+stop5.toFixed(1)+'%, rgba(0,0,0,0.8) '+stop6.toFixed(1)+'%)'});
		
		html = '';

		list.sort(function(a, b) {
			if(a.value < b.value) return -1;
			else return 1;
		});

		for(var i = 0; i < list.length; i++){
			a = list[i].value.match(/[0-9]{2}\:[0-9]{2}/);
			if(a){
				ico = (list[i].icon ? '<img src="resources/'+list[i].icon+'" />' : '<svg width="1em" height="1em" viewBox="-16 -16 32 32"><circle cx="0" cy="0" r="2" fill="'+list[i].colour+'"></circle></svg>');
				html += '<li style="color:'+list[i].colour+'">'+list[i].value+(list[i].user!=list[i].value ? ' ('+list[i].user+')':'')+' '+ico+''+list[i].title+'</li>';
			}
		}

		if(html) S('#times').html('<ul>'+html+'</ul>');
		this.paper.draw();
		
		console.log('Run time: '+(new Date() - now)+' ms');

		return;
	}

	S('#splash').css({'display':'none'});



	// TypeAhead setup
	
	// Define a function for scoring how well a string matches
	function getScore(str1,str2,v1,v2,v3){
		var r = 0;
		str1 = str1.toUpperCase();
		str2 = str2.toUpperCase();
		if(str1.indexOf(str2)==0) r += (v1||3);
		if(str1.indexOf(str2)>0) r += (v2||1);
		if(str1==str2) r += (v3||4);
		return r;
	}

	// ISO 3166 country code conversion
	var cc = {'AD':'Andorra','AE':'United Arab Emirates','AF':'Afghanistan','AG':'Antigua and Barbuda','AI':'Anguilla','AL':'Albania','AM':'Armenia','AO':'Angola','AQ':'Antarctica','AR':'Argentina','AS':'American Samoa','AT':'Austria','AU':'Australia','AW':'Aruba','AX':'Åland Islands','AZ':'Azerbaijan','BA':'Bosnia and Herzegovina','BB':'Barbados','BD':'Bangladesh','BE':'Belgium','BF':'Burkina Faso','BG':'Bulgaria','BH':'Bahrain','BI':'Burundi','BJ':'Benin','BL':'Saint Barthélemy','BM':'Bermuda','BN':'Brunei Darussalam','BO':'Bolivia','BQ':'Bonaire, Sint Eustatius and Saba','BR':'Brazil','BS':'Bahamas','BT':'Bhutan','BV':'Bouvet Island','BW':'Botswana','BY':'Belarus','BZ':'Belize','CA':'Canada','CC':'Cocos (Keeling) Islands','CD':'Congo, the Democratic Republic of the','CF':'Central African Republic','CG':'Congo','CH':'Switzerland','CI':'Côte d\'Ivoire','CK':'Cook Islands','CL':'Chile','CM':'Cameroon','CN':'China','CO':'Colombia','CR':'Costa Rica','CU':'Cuba','CV':'Cabo Verde','CW':'Curaçao','CX':'Christmas Island','CY':'Cyprus','CZ':'Czech Republic','DE':'Germany','DJ':'Djibouti','DK':'Denmark','DM':'Dominica','DO':'Dominican Republic','DZ':'Algeria','EC':'Ecuador','EE':'Estonia','EG':'Egypt','EH':'Western Sahara','ER':'Eritrea','ES':'Spain','ET':'Ethiopia','FI':'Finland','FJ':'Fiji','FK':'Falkland Islands (Malvinas)','FM':'Micronesia, Federated States of','FO':'Faroe Islands','FR':'France','GA':'Gabon','GB':'UK','GD':'Grenada','GE':'Georgia','GF':'French Guiana','GG':'Guernsey','GH':'Ghana','GI':'Gibraltar','GL':'Greenland','GM':'Gambia','GN':'Guinea','GP':'Guadeloupe','GQ':'Equatorial Guinea','GR':'Greece','GS':'South Georgia and the South Sandwich Islands','GT':'Guatemala','GU':'Guam','GW':'Guinea-Bissau','GY':'Guyana','HK':'Hong Kong','HM':'Heard Island and McDonald Islands','HN':'Honduras','HR':'Croatia','HT':'Haiti','HU':'Hungary','ID':'Indonesia','IE':'Ireland','IL':'Israel','IM':'Isle of Man','IN':'India','IO':'British Indian Ocean Territory','IQ':'Iraq','IR':'Iran, Islamic Republic of','IS':'Iceland','IT':'Italy','JE':'Jersey','JM':'Jamaica','JO':'Jordan','JP':'Japan','KE':'Kenya','KG':'Kyrgyzstan','KH':'Cambodia','KI':'Kiribati','KM':'Comoros','KN':'Saint Kitts and Nevis','KP':'Korea, Democratic People\'s Republic of','KR':'Korea, Republic of','KW':'Kuwait','KY':'Cayman Islands','KZ':'Kazakhstan','LA':'Lao People\'s Democratic Republic','LB':'Lebanon','LC':'Saint Lucia','LI':'Liechtenstein','LK':'Sri Lanka','LR':'Liberia','LS':'Lesotho','LT':'Lithuania','LU':'Luxembourg','LV':'Latvia','LY':'Libya','MA':'Morocco','MC':'Monaco','MD':'Moldova, Republic of','ME':'Montenegro','MF':'Saint Martin (French part)','MG':'Madagascar','MH':'Marshall Islands','MK':'Macedonia, the former Yugoslav Republic of','ML':'Mali','MM':'Myanmar','MN':'Mongolia','MO':'Macao','MP':'Northern Mariana Islands','MQ':'Martinique','MR':'Mauritania','MS':'Montserrat','MT':'Malta','MU':'Mauritius','MV':'Maldives','MW':'Malawi','MX':'Mexico','MY':'Malaysia','MZ':'Mozambique','NA':'Namibia','NC':'New Caledonia','NE':'Niger','NF':'Norfolk Island','NG':'Nigeria','NI':'Nicaragua','NL':'Netherlands','NO':'Norway','NP':'Nepal','NR':'Nauru','NU':'Niue','NZ':'New Zealand','OM':'Oman','PA':'Panama','PE':'Peru','PF':'French Polynesia','PG':'Papua New Guinea','PH':'Philippines','PK':'Pakistan','PL':'Poland','PM':'Saint Pierre and Miquelon','PN':'Pitcairn','PR':'Puerto Rico','PS':'Palestine, State of','PT':'Portugal','PW':'Palau','PY':'Paraguay','QA':'Qatar','RE':'Réunion','RO':'Romania','RS':'Serbia','RU':'Russian Federation','RW':'Rwanda','SA':'Saudi Arabia','SB':'Solomon Islands','SC':'Seychelles','SD':'Sudan','SE':'Sweden','SG':'Singapore','SH':'Saint Helena, Ascension and Tristan da Cunha','SI':'Slovenia','SJ':'Svalbard and Jan Mayen','SK':'Slovakia','SL':'Sierra Leone','SM':'San Marino','SN':'Senegal','SO':'Somalia','SR':'Suriname','SS':'South Sudan','ST':'Sao Tome and Principe','SV':'El Salvador','SX':'Sint Maarten','SY':'Syrian Arab Republic','SZ':'Swaziland','TC':'Turks and Caicos Islands','TD':'Chad','TF':'French Southern Territories','TG':'Togo','TH':'Thailand','TJ':'Tajikistan','TK':'Tokelau','TL':'Timor-Leste','TM':'Turkmenistan','TN':'Tunisia','TO':'Tonga','TR':'Turkey','TT':'Trinidad and Tobago','TV':'Tuvalu','TW':'Taiwan, Province of China','TZ':'Tanzania','UA':'Ukraine','UG':'Uganda','UM':'US Minor Outlying Islands','US':'USA','UY':'Uruguay','UZ':'Uzbekistan','VA':'Holy See','VC':'Saint Vincent and the Grenadines','VE':'Venezuela','VG':'British Virgin Islands','VI':'Virgin Islands, U.S.','VN':'Viet Nam','VU':'Vanuatu','WF':'Wallis and Futuna','WS':'Samoa','YE':'Yemen','YT':'Mayotte','ZA':'South Africa','ZM':'Zambia','ZW':'Zimbabwe'};

	// Build the barchart object attached to <input type="text" id="typeahead">
	this.typeahead = TypeAhead.init('#typeahead',{
		'items': [],
		'max': 8,	// Set a maximum number to list
		'render': function(d){
			// Construct the label shown in the drop down list
			return d.displayname;
		},
		'process': function(city){
			// A city has been selected
			S().ajax(city.file,{
				'this': _obj,
				'city': city,
				'dataType': 'text',
				'success': function(d,attr){
					var d,lat,lon,i,line;
					d = d.replace(/\r/,'').split(/[\n]/);
					for(i = 0; i < d.length; i++){
						line = d[i].split(/\t/);
						if(line[0] == attr.city.i){
							lat = parseFloat(line[1]);
							lon = parseFloat(line[2]);
							tz = line[3];
							i = d.length;	// Leave loop
						}
					}
					this.setGeo(lat,lon,tz);
					S('#typeahead')[0].value = attr.city.displayname;
				},
				'error': function(e,attr){ console.error('Unable to load '+attr.file,e); }
			});
		},
		'rank': function(d,str){
			// Calculate the weight to add to this airport
			var r = 0;
			var words,w;
			if(d){
				words = str.split(/[\s\,]/);
				if(typeof d['name']==="string") r += getScore(d['name'],str);
				if(typeof d['truename']==="string") r += getScore(d['truename'],str);
				for(w = 0; w < words.length; w++){
					if(words[w]){
						if(typeof d['name']==="string") r += getScore(d['name'],words[w]);
						if(typeof d['truename']==="string") r += getScore(d['truename'],words[w]);
						if(typeof d['country']==="string") r += getScore(d['country'],words[w]);
					}
				}
				r *= d['n'];
			}
			return r;
		}
	});
	S('#typeahead').on('focus',function(e){
		e.currentTarget.value = "";
	});
	
	S('form').on('submit',function(e){
		e.preventDefault();
		e.stopPropagation();
		console.log('submit')
	});
	
	
	var loading = {};
	// Attach a callback to the 'change' event. This gets called each time the user enters/deletes a character.
	this.typeahead.on('change',{'me':this.typeahead},function(e){
		var name = toPlainASCII(e.target.value.toLowerCase());
		var fl = name[0];
		if(fl && fl.match(/[a-zA-Z\'\`]/i)){
			if(!loading[fl]){
				S(document).ajax('geo/ranked-'+fl+'.tsv',{
					'this': e.data.me,
					'dataType': 'text',
					'fl':fl,
					'success': function(d,attr){
						var data,l,c,header;
						d = d.replace(/\r/g,'').split(/[\n]/);
						data = new Array(d.length);
						header = ["truename","name","cc","admin1","n"];
						for(l = 0; l < d.length; l++){
							cols = d[l].split(/\t/);
							datum = {};
							for(c = 0; c < cols.length; c++){
								datum[header[c]] = cols[c].replace(/(^\"|\"$)/g,"");
								// Convert numbers
								if(parseFloat(datum[header[c]])+"" == datum[header[c]]) datum[header[c]] = parseFloat(datum[header[c]]);
								datum['id'] = attr.fl+'-'+l;
								datum['i'] = l;
								datum['file'] = 'geo/cities/'+attr.fl+'-'+(Math.floor(l/100))+'.tsv';
								datum['country'] = (datum.cc && cc[datum.cc] ? cc[datum.cc]:'');
								datum['displayname'] = datum.truename+(datum.cc=="US" ? ', '+datum['admin1']+'':'')+(datum.country ? ', '+datum.country : '');
							}
							data[l] = datum;
						}
						this.addItems(data);
					},
					'error': function(e,attr){ console.error('Unable to load file '+attr.file,e); }
				});
				loading[fl] = true;
			}
		}
	});

	function toPlainASCII(str){
	
		var map = [
			{'b':'A', 'l':/[\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F]/g},
			{'b':'AA','l':/[\uA732]/g},
			{'b':'AE','l':/[\u00C6\u01FC\u01E2]/g},
			{'b':'AO','l':/[\uA734]/g},
			{'b':'AU','l':/[\uA736]/g},
			{'b':'AV','l':/[\uA738\uA73A]/g},
			{'b':'AY','l':/[\uA73C]/g},
			{'b':'B', 'l':/[\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181]/g},
			{'b':'C', 'l':/[\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E]/g},
			{'b':'D', 'l':/[\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779]/g},
			{'b':'DZ','l':/[\u01F1\u01C4]/g},
			{'b':'Dz','l':/[\u01F2\u01C5]/g},
			{'b':'E', 'l':/[\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E]/g},
			{'b':'F', 'l':/[\u0046\u24BB\uFF26\u1E1E\u0191\uA77B]/g},
			{'b':'G', 'l':/[\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E]/g},
			{'b':'H', 'l':/[\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D]/g},
			{'b':'I', 'l':/[\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197]/g},
			{'b':'J', 'l':/[\u004A\u24BF\uFF2A\u0134\u0248]/g},
			{'b':'K', 'l':/[\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2]/g},
			{'b':'L', 'l':/[\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780]/g},
			{'b':'LJ','l':/[\u01C7]/g},
			{'b':'Lj','l':/[\u01C8]/g},
			{'b':'M', 'l':/[\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C]/g},
			{'b':'N', 'l':/[\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4]/g},
			{'b':'NJ','l':/[\u01CA]/g},
			{'b':'Nj','l':/[\u01CB]/g},
			{'b':'O', 'l':/[\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C]/g},
			{'b':'OI','l':/[\u01A2]/g},
			{'b':'OO','l':/[\uA74E]/g},
			{'b':'OU','l':/[\u0222]/g},
			{'b':'P', 'l':/[\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754]/g},
			{'b':'Q', 'l':/[\u0051\u24C6\uFF31\uA756\uA758\u024A]/g},
			{'b':'R', 'l':/[\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782]/g},
			{'b':'S', 'l':/[\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784]/g},
			{'b':'T', 'l':/[\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786]/g},
			{'b':'TZ','l':/[\uA728]/g},
			{'b':'U', 'l':/[\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244]/g},
			{'b':'V', 'l':/[\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245]/g},
			{'b':'VY','l':/[\uA760]/g},
			{'b':'W', 'l':/[\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72]/g},
			{'b':'X', 'l':/[\u0058\u24CD\uFF38\u1E8A\u1E8C]/g},
			{'b':'Y', 'l':/[\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE]/g},
			{'b':'Z', 'l':/[\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762]/g},
			{'b':'a', 'l':/[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]/g},
			{'b':'aa','l':/[\uA733]/g},
			{'b':'ae','l':/[\u00E6\u01FD\u01E3]/g},
			{'b':'ao','l':/[\uA735]/g},
			{'b':'au','l':/[\uA737]/g},
			{'b':'av','l':/[\uA739\uA73B]/g},
			{'b':'ay','l':/[\uA73D]/g},
			{'b':'b', 'l':/[\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253]/g},
			{'b':'c', 'l':/[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]/g},
			{'b':'d', 'l':/[\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A]/g},
			{'b':'dz','l':/[\u01F3\u01C6]/g},
			{'b':'e', 'l':/[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g},
			{'b':'f', 'l':/[\u0066\u24D5\uFF46\u1E1F\u0192\uA77C]/g},
			{'b':'g', 'l':/[\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F]/g},
			{'b':'h', 'l':/[\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265]/g},
			{'b':'hv','l':/[\u0195]/g},
			{'b':'i', 'l':/[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]/g},
			{'b':'j', 'l':/[\u006A\u24D9\uFF4A\u0135\u01F0\u0249]/g},
			{'b':'k', 'l':/[\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3]/g},
			{'b':'l', 'l':/[\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747]/g},
			{'b':'lj','l':/[\u01C9]/g},
			{'b':'m', 'l':/[\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F]/g},
			{'b':'n', 'l':/[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]/g},
			{'b':'nj','l':/[\u01CC]/g},
			{'b':'o', 'l':/[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]/g},
			{'b':'oi','l':/[\u01A3]/g},
			{'b':'ou','l':/[\u0223]/g},
			{'b':'oo','l':/[\uA74F]/g},
			{'b':'p','l':/[\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755]/g},
			{'b':'q','l':/[\u0071\u24E0\uFF51\u024B\uA757\uA759]/g},
			{'b':'r','l':/[\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783]/g},
			{'b':'s','l':/[\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B]/g},
			{'b':'t','l':/[\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787]/g},
			{'b':'tz','l':/[\uA729]/g},
			{'b':'u','l':/[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]/g},
			{'b':'v','l':/[\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C]/g},
			{'b':'vy','l':/[\uA761]/g},
			{'b':'w','l':/[\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73]/g},
			{'b':'x','l':/[\u0078\u24E7\uFF58\u1E8B\u1E8D]/g},
			{'b':'y','l':/[\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF]/g},
			{'b':'z','l':/[\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763]/g}
		];


		for(var i = 0; i < map.length; i++) str = str.replace(map[i].l, map[i].b);

		return str;
	}
	return this;
}


function log10(x) {
	return Math.LOG10E * Math.log(x);
}

// Create an object to deal with planet ephemerides
function Planets(){
	// Heliocentric Osculating Orbital Elements Referred to the Mean Equinox and Ecliptic of Date for 2013: http://asa.usno.navy.mil/static/files/2013/Osculating_Elements_2013.txt
	// Values of the Osculating Orbital Elements for 8th August 1997: http://www.stargazing.net/kepler/ellipse.html
	// Uncertainties in RA (pre 2050) should be: <400" (Jupiter); <600" (Saturn); <50" everything else
	// See also: https://ssd.jpl.nasa.gov/txt/p_elem_t1.txt
	//           https://ssd.jpl.nasa.gov/?planet_pos
	this.planets = [{
		"name": "Mercury",
		"radius":2439.7,	// km
		"interval": 0.5,
		"colour": "rgb(170,150,170)",
		"magnitude": function(d){ return -0.36 + 5*log10(d.r*d.R) + 0.027 * d.FV + 2.2E-13 * Math.pow(d.FV,6); },
		"elements": [
			{"jd":2456280.5,"i":7.0053,"o":48.485,"p":77.658,"a":0.387100,"n":4.09232,"e":0.205636,"L":191.7001},
			{"jd":2456360.5,"i":7.0052,"o":48.487,"p":77.663,"a":0.387098,"n":4.09235,"e":0.205646,"L":159.0899},
			{"jd":2456440.5,"i":7.0052,"o":48.490,"p":77.665,"a":0.387097,"n":4.09236,"e":0.205650,"L":126.4812},
			{"jd":2456520.5,"i":7.0052,"o":48.493,"p":77.669,"a":0.387098,"n":4.09235,"e":0.205645,"L":93.8725},
			{"jd":2456600.5,"i":7.0052,"o":48.495,"p":77.672,"a":0.387099,"n":4.09234,"e":0.205635,"L":61.2628},
			{"jd":2456680.5,"i":7.0052,"o":48.498,"p":77.677,"a":0.387098,"n":4.09234,"e":0.205633,"L":28.6524}
		]
	},{
		"name": "Venus",
		"radius": 6051.9,	// km
		"interval": 1,
		"colour": "rgb(245,222,179)",
		"magnitude": function(d){ return -4.34 + 5*log10(d.a*d.R) + 0.013 * d.FV + 4.2E-7*Math.pow(d.FV,3); },
		"elements": [
			{"jd":2456280.5,"i":3.3949,"o":76.797,"p":132.00,"a":0.723328,"n":1.60214,"e":0.006777,"L":209.0515},
			{"jd":2456360.5,"i":3.3949,"o":76.799,"p":132.07,"a":0.723327,"n":1.60215,"e":0.006787,"L":337.2248},
			{"jd":2456440.5,"i":3.3949,"o":76.802,"p":131.97,"a":0.723333,"n":1.60213,"e":0.006780,"L":105.3980},
			{"jd":2456520.5,"i":3.3949,"o":76.804,"p":131.99,"a":0.723327,"n":1.60215,"e":0.006769,"L":233.5729},
			{"jd":2456600.5,"i":3.3949,"o":76.807,"p":132.03,"a":0.723326,"n":1.60215,"e":0.006775,"L":1.7475},
			{"jd":2456680.5,"i":3.3948,"o":76.808,"p":131.63,"a":0.723345,"n":1.60209,"e":0.006770,"L":129.9169}
		]
	},{
		"name":"Earth",
		"elements" : [
			{"jd":2450680.5,"i":0.00041,"o":349.2,"p":102.8517,"a":1.0000200,"n":0.9855796,"e":0.0166967,"L":328.40353},
			{"jd":2456320.5,"i":0.0,"o":349.2,"p":103.005,"a":0.999986,"n":0.985631,"e":0.016682,"L":127.4201},
			{"jd":2456400.5,"i":0.0,"o":349.2,"p":103.022,"a":0.999987,"n":0.985630,"e":0.016677,"L":206.2740},
			{"jd":2456480.5,"i":0.0,"o":349.2,"p":103.119,"a":1.000005,"n":0.985603,"e":0.016675,"L":285.1238},
			{"jd":2456560.5,"i":0.0,"o":349.2,"p":103.161,"a":0.999995,"n":0.985618,"e":0.016682,"L":3.9752},
			{"jd":2456680.5,"i":0.0,"o":349.2,"p":103.166,"a":1.000005,"n":0.985603,"e":0.016693,"L":122.2544}
		]
	},{
		"name":"Mars",
		"radius": 3386,	// km
		"interval": 1,
		"colour": "rgb(255,50,50)",
		"include": true,
		"magnitude": function(d){ return -1.51 + 5*log10(d.r*d.R) + 0.016 * d.FV; },
		"elements":[
			{"jd":2450680.5,"i":1.84992,"o":49.5664,"p":336.0882,"a":1.5236365,"n":0.5240613,"e":0.0934231,"L":262.42784},
			{"jd":2456320.5,"i":1.8497,"o":49.664,"p":336.249,"a":1.523605,"n":0.524079,"e":0.093274,"L":338.1493},
			{"jd":2456400.5,"i":1.8497,"o":49.666,"p":336.268,"a":1.523627,"n":0.524068,"e":0.093276,"L":20.0806},
			{"jd":2456480.5,"i":1.8496,"o":49.668,"p":336.306,"a":1.523731,"n":0.524014,"e":0.093316,"L":62.0048},
			{"jd":2456560.5,"i":1.8495,"o":49.666,"p":336.329,"a":1.523748,"n":0.524005,"e":0.093385,"L":103.9196},
			{"jd":2456680.5,"i":1.8495,"o":49.665,"p":336.330,"a":1.523631,"n":0.524066,"e":0.093482,"L":166.8051}
		]
	},{
		"name":"Jupiter",
		"radius": 69173,	// km
		"interval": 10,
		"colour": "rgb(255,150,150)",
		"include": true,
		"magnitude": function(d){ return -9.25 + 5*log10(d.r*d.R) + 0.014 * d.FV; },
		"elements":[
			{"jd":2456280.5,"i":1.3033,"o":100.624,"p":14.604,"a":5.20269,"n":0.083094,"e":0.048895,"L":68.0222},
			{"jd":2456360.5,"i":1.3033,"o":100.625,"p":14.588,"a":5.20262,"n":0.083095,"e":0.048895,"L":74.6719},
			{"jd":2456440.5,"i":1.3033,"o":100.627,"p":14.586,"a":5.20259,"n":0.083096,"e":0.048892,"L":81.3228},
			{"jd":2456520.5,"i":1.3033,"o":100.629,"p":14.556,"a":5.20245,"n":0.083099,"e":0.048892,"L":87.9728},
			{"jd":2456600.5,"i":1.3033,"o":100.631,"p":14.576,"a":5.20254,"n":0.083097,"e":0.048907,"L":94.6223},
			{"jd":2456680.5,"i":1.3033,"o":100.633,"p":14.592,"a":5.20259,"n":0.083096,"e":0.048891,"L":101.2751}
		]
	},{
		"name":"Saturn",
		"radius": 57316,	// km
		"interval": 10,
		"colour": "rgb(200,150,150)",
		"magnitude": function(d){
			var slon = Math.atan2(d.y,d.x);
			var slat = Math.atan2(d.z, Math.sqrt(d.x*d.x + d.y*d.y));
			while(slon < 0){ slon += 2*Math.PI; }
			while(slon >= 360){ slon -= 2*Math.PI; }
			var ir = d.d2r*28.06;
			var Nr = d.d2r*(169.51 + 3.82E-5 * (d.jd-2451543.5));	// Compared to J2000 epoch
			var B = Math.asin(Math.sin(slat) * Math.cos(ir) - Math.cos(slat) * Math.sin(ir) * Math.sin(slon-Nr));
			return -9.0  + 5*log10(d.r*d.R) + 0.044 * d.FV + (-2.6 * Math.sin(Math.abs(B)) + 1.2 * Math.pow(Math.sin(B),2));
		},
		"elements":[
			{"jd":2456280.5,"i":2.4869,"o":113.732,"p":90.734,"a":9.51836,"n":0.033583,"e":0.055789,"L":208.6057},
			{"jd":2456360.5,"i":2.4869,"o":113.732,"p":90.979,"a":9.52024,"n":0.033574,"e":0.055794,"L":211.2797},
			{"jd":2456440.5,"i":2.4869,"o":113.732,"p":91.245,"a":9.52234,"n":0.033562,"e":0.055779,"L":213.9525},
			{"jd":2456520.5,"i":2.4869,"o":113.732,"p":91.500,"a":9.52450,"n":0.033551,"e":0.055724,"L":216.6279},
			{"jd":2456600.5,"i":2.4870,"o":113.732,"p":91.727,"a":9.52630,"n":0.033541,"e":0.055691,"L":219.3014},
			{"jd":2456680.5,"i":2.4870,"o":113.733,"p":92.021,"a":9.52885,"n":0.033528,"e":0.055600,"L":221.9730}
		]
	},{
		"name":"Uranus",
		"radius": 25266,	// km
		"interval": 20,
		"colour": "rgb(130,150,255)",
		"magnitude": function(d){ return -7.15 + 5*log10(d.r*d.R) + 0.001 * d.FV; },
		"elements":[
			{"jd":2456280.5,"i":0.7726,"o":74.004,"p":169.227,"a":19.2099,"n":0.011713,"e":0.046728,"L":9.1400},
			{"jd":2456360.5,"i":0.7727,"o":73.997,"p":169.314,"a":19.2030,"n":0.011720,"e":0.047102,"L":10.0873},
			{"jd":2456440.5,"i":0.7728,"o":73.989,"p":169.434,"a":19.1953,"n":0.011727,"e":0.047509,"L":11.0340},
			{"jd":2456520.5,"i":0.7728,"o":73.989,"p":169.602,"a":19.1882,"n":0.011733,"e":0.047874,"L":11.9756},
			{"jd":2456600.5,"i":0.7728,"o":73.985,"p":169.740,"a":19.1816,"n":0.011739,"e":0.048215,"L":12.9200},
			{"jd":2456680.5,"i":0.7728,"o":73.983,"p":169.962,"a":19.1729,"n":0.011747,"e":0.048650,"L":13.8617}
		]
	},{
		"name":"Neptune",
		"radius": 24553,	// km
		"interval": 20,
		"colour": "rgb(100,100,255)",
		"magnitude": function(d){ return -6.90 + 5*log10(d.r*d.R) + 0.001 * d.FV; },
		"elements":[
			{"jd":2456280.5,"i":1.7686,"o":131.930,"p":53.89,"a":30.0401,"n":0.005990,"e":0.010281,"L":333.6121},
			{"jd":2456360.5,"i":1.7688,"o":131.935,"p":56.47,"a":30.0259,"n":0.005994,"e":0.010138,"L":334.0856},
			{"jd":2456440.5,"i":1.7690,"o":131.940,"p":59.24,"a":30.0108,"n":0.005999,"e":0.009985,"L":334.5566},
			{"jd":2456520.5,"i":1.7692,"o":131.946,"p":61.52,"a":29.9987,"n":0.006002,"e":0.009816,"L":335.0233},
			{"jd":2456600.5,"i":1.7694,"o":131.951,"p":63.84,"a":29.9867,"n":0.006006,"e":0.009690,"L":335.4937},
			{"jd":2456680.5,"i":1.7697,"o":131.957,"p":66.66,"a":29.9725,"n":0.006010,"e":0.009508,"L":335.9564}
		]
	}];

	this.d2r = Math.PI/180;
	this.r2d = 180/Math.PI;
	this.AUinkm = 149597870.700;
	return this;
}

// Get the ephemeris for the specified planet number
// Input:
//   planet = ID
//   day = Julian Date to calculate the ephemeris for
// Method from http://www.stargazing.net/kepler/ellipse.html#twig06
Planets.prototype.getEphem = function(planet,day){

	var i,v,e,x,y,z,ec,q,ra,dc,R,mag,FV,phase;

	if(typeof planet==="number"){
		i = planet;
	}else{
		var match = -1;
		for(var a = 0 ; a < this.planets.length ; a++){
			if(this.planets[a].name==planet) match = a;
		}
		if(match < 0) return this;
		if(match == 2) return this;	// Can't calculate Earth
		i = match;
	}

	// Heliocentric coordinates of planet
	v = this.getHeliocentric(this.planets[i],day);

	// Heliocentric coordinates of Earth
	e = this.getHeliocentric(this.planets[2],day);

	// Geocentric ecliptic coordinates of the planet
	x = v.xyz[0] - e.xyz[0];
	y = v.xyz[1] - e.xyz[1];
	z = v.xyz[2] - e.xyz[2];

	// Geocentric equatorial coordinates of the planet
	ec = 23.439292*this.d2r; // obliquity of the ecliptic for the epoch the elements are referred to
	q = [x,y * Math.cos(ec) - z * Math.sin(ec),y * Math.sin(ec) + z * Math.cos(ec)];

	ra = Math.atan(q[1]/q[0])*this.r2d;
	if(q[0] < 0) ra += 180;
	if(q[0] >= 0 && q[1] < 0) ra += 360;

	dc = Math.atan(q[2] / Math.sqrt(q[0]*q[0] + q[1]*q[1]))*this.r2d;

	R = Math.sqrt(q[0]*q[0] + q[1]*q[1] + q[2]*q[2]);

	// Calculate the magnitude (http://stjarnhimlen.se/comp/tutorial.html)
	var angdiam = (this.planets[i].radius*2/(R*this.AUinkm));
	mag = 1;

	// planet's heliocentric distance, v.r, its geocentric distance, R, and the distance to the Sun, e.r.
	FV = Math.acos( ( v.r*v.r + R*R - e.r*e.r ) / (2*v.r*R) );
	phase = (1 + Math.cos(FV))/2;
	mag = this.planets[i].magnitude({a:v.r,r:v.r,R:R,FV:FV*this.r2d,x:x,y:y,z:z,jd:day,d2r:this.d2r});

	return [ra,dc,mag];
}

Planets.prototype.getHeliocentric = function(planet,jd,i){
	var min = 1e10;
	var mn,p,d,M,v,r;

	// Choose a set of orbital elements
	if(!i){
		// Loop over elements and pick the one closest in time
		for(var j = 0; j < planet.elements.length ;j++){
			mn = Math.abs(planet.elements[j].jd-jd);
			if(mn < min){
				i = j;
				min = mn;
			}
		}
	}
	p = planet.elements[i];

	// The day number is the number of days (decimal) since epoch of elements.
	d = (jd - p.jd);

	// Heliocentric coordinates of planet
	M = this.meanAnomaly(p.n,d,p.L,p.p)
	v = this.trueAnomaly(M*this.d2r,p.e,10);
	r = p.a * (1 - Math.pow(p.e,2)) / (1 + p.e * Math.cos(v*this.d2r));
	return {xyz: this.heliocentric(v*this.d2r,r,p.p*this.d2r,p.o*this.d2r,p.i*this.d2r), M:M, v:v, r:r, i:i, d:d, elements:p};
}

// Find the Mean Anomaly (M, degrees) of the planet where
//  n is daily motion
//  d is the number of days since the date of the elements
//  L is the mean longitude (deg)
//  p is the longitude of perihelion (deg) 
//  M should be in range 0 to 360 degrees
Planets.prototype.meanAnomaly = function(d,n,L,p){
	var M = n * d + L - p;
	while(M < 0){ M += 360; }
	while(M >= 360){ M -= 360; }
	return M;
}

// Heliocentric coordinates of the planet where:	
//  o is longitude of ascending node (radians)
//  p is longitude of perihelion (radians)
//  i is inclination of plane of orbit (radians)
// the quantity v + o - p is the angle of the planet measured in the plane of the orbit from the ascending node
Planets.prototype.heliocentric = function(v,r,p,o,i){
	var vpo = v + p - o;
	var svpo = Math.sin(vpo);
	var cvpo = Math.cos(vpo);
	var co = Math.cos(o);
	var so = Math.sin(o);
	var ci = Math.cos(i);
	var si = Math.sin(i);
	return [r * (co * cvpo - so * svpo * ci),r * (so * cvpo + co * svpo * ci),r * (svpo * si)]
}

/*
	Find the True Anomaly given
	m  -  the 'mean anomaly' in orbit theory (in radians)
	ecc - the eccentricity of the orbit
*/
Planets.prototype.trueAnomaly = function(m,ecc,eps){
	var e = m;        // first guess

	if(typeof eps==="number"){
		var delta = 0.05; // set delta equal to a dummy value
		var eps = 10;     // eps - the precision parameter - solution will be within 10^-eps of the true value. Don't set eps above 14, as convergence can't be guaranteed
	
		while(Math.abs(delta) >= Math.pow(10,-eps)){    // converged?
			delta = e - ecc * Math.sin(e) - m;          // new error
			e -= delta / (1 - ecc * Math.cos(e));    // corrected guess
		}
		var v = 2 * Math.atan(Math.pow(((1 + ecc) / (1 - ecc)),0.5) * Math.tan(0.5 * e));
		if(v < 0) v+= Math.PI*2;
	}else{
		v = m + ( (2 * ecc - Math.pow(ecc,3)/4)*Math.sin(m) + 1.25*Math.pow(ecc,2)*Math.sin(2*m) + (13/12)*Math.pow(ecc,3)*Math.sin(3*m) );
	}
	return v*this.r2d; // return estimate
}


S(document).ready(function(){
	
	app = new Application({});
	app.setGeo(53.9929,-1.5457,"Europe/London","Harrogate, UK");
	//app.setGeo(-33.85702,151.21462,"Australia/Sydney","Sydney, Australia");

});