var app;

function Application(){

	this.objects = {};

	// Constants
	var d2r = Math.PI/180;
	var r2d = 180.0/Math.PI;

	// The Julian Date of the Unix Time epoch is 2440587.5
	function getJD(clock){
		if(!clock) clock = new Date();
		return (clock.getTime()/86400000.0) + 2440587.5;
	};

	this.setGeo = function(lat,lon){
		this.latitude = {'deg':lat,'rad':lat*d2r};
		this.longitude = {'deg':lon,'rad':lon*d2r};
		this.setClock(this.clock);
		return this;
	}

	this.getPositions = function(objects){
		var c,o;
		var now = new Date();
		for(obj in objects){
			if(obj=="sun"){
				this.objects[obj] = sunPosition(this.times.JD);
			}else if(obj=="moon"){
				this.objects[obj] = moonPosition(this.times.JD,this.objects.sun);
				this.objects[obj].phase = moonPhase(this.times.JD);
			}
			
			c = this.ecliptic2azel(this.objects[obj].lon*d2r,this.objects[obj].lat*d2r,this.times.LST);
			this.objects[obj].az = c.az;
			this.objects[obj].el = c.el;
		}
		return this.objects;
	}

	// Find the Julian Date, Local Sidereal Time and Greenwich Sidereal Time
	this.setClock = function(clock){
		if(!clock){
			this.clock = new Date();
			clock = this.clock;
		}
		this.clock = clock;
		lon = (this.longitude.deg||0);

		var JD,JD0,S,T,T0,UT,A,GST,d,LST;
		JD = getJD(clock);
		JD0 = Math.floor(JD-0.5)+0.5;
		S = JD0-2451545.0;
		T = S/36525.0;
		T0 = (6.697374558 + (2400.051336*T) + (0.000025862*T*T))%24;
		if(T0 < 0) T0 += 24;
		UT = (((clock.getUTCMilliseconds()/1000 + clock.getUTCSeconds())/60) + clock.getUTCMinutes())/60 + clock.getUTCHours();
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


	/* Add events */
	var dateControl = document.querySelector('input[type="date"]');
	S(dateControl).on('change',{me:this},function(e){
		e.data.me.setDate(e.currentTarget.value);
	});
	// Add keypress
	S(document).on('keyup',{'me':this},function(e){
		var d;
		if(e.originalEvent.keyCode==37){
			d = new Date(dateControl.value);
			d.setHours(12);
			d.setDate(d.getDate() - 1);
			e.data.me.setDate(d.toISOString().substr(0,10));
		}else if(e.originalEvent.keyCode==39){
			d = new Date(dateControl.value);
			d.setHours(12);
			d.setDate(d.getDate() + 1);
			e.data.me.setDate(d.toISOString().substr(0,10));
		}
	});
	this.resize = function(){
		this.setDate();
		return this;
	}
	var _obj = this;
	window.onresize = function(event){ _obj.resize(); };


	this.setDate = function(t){

		var now,iso;

		if(!dateControl){
			console.error('No date control defined');
			return this;
		}

		now = new Date();
		if(!t) t = now;
		if(typeof t==="string") t = new Date(t);
		iso = t.toISOString().substr(0,10);

		dateControl.value = iso.substr(0,10);
		this.setClock(new Date(iso));

		clock = new Date(this.clock);
		// Set to midnight (today)
		clock.setHours(0);
		clock.setMinutes(0);
		clock.setSeconds(0);
		clock.setMilliseconds(0);


		var tall = 300;
		var wide = 0;

		// Reset size of svg
		if(this.paper){
			this.paper.clear();
			wide = S('#sky')[0].offsetWidth;
			this.paper.paper.attr('width',wide).attr('viewBox','0 0 '+wide+' '+tall);
		}else{
			wide = S('#sky')[0].offsetWidth;
		}

		if(!this.paper) this.paper = new SVG('sky',wide,tall);

		var objects = {
			'sun':{'path':[],'colour':'orange','elevation':[]},
			'moon':{'path':[],'colour':'#999','elevation':[]}
		};
		var list = [];

		function getCoords(m,el){ return [m*wide/1440,tall/2 - el*tall/180]; }

		xy = getCoords(40,0);
		this.paper.text(xy[0],xy[1],iso).attr({'fill':'black'});
		this.paper.path([['M',getCoords(0,0)],['L',getCoords(1440,0)]]).attr({'stroke':'black','fill':'rgba(0,0,0,0.3)'});
	
		var oldpos;
		for(var i = 0; i < 24*60; i++){
			clock.setMinutes(clock.getMinutes()+1);
			app.setClock(clock);
			pos = app.getPositions(objects);
			for(var o in objects){
				objects[o].elevation.push([app.clock.toISOString(),pos[o].el]);
				objects[o].path.push([(i==0 ? 'M':'L'),getCoords(i,pos[o].el)]);
			}
			if(i==0) list.push({'title':'Moon phase','value':pos.moon.phase.toFixed(2)+'%'});
			oldpos = pos;
		}

		sunsize = 0.5;

		for(var o in objects){
			for(var i = 1; i < objects[o].elevation.length; i++){
				if(objects[o].elevation[i][1] >= 0-(sunsize/2) && objects[o].elevation[i-1][1] < 0-(sunsize/2)) list.push({'title':o.substr(0,1).toUpperCase()+o.substr(1,)+'rise','value':objects[o].elevation[i][0].substr(11,5)});
				if(objects[o].elevation[i][1] <= 0-(sunsize/2) && objects[o].elevation[i-1][1] > 0-(sunsize/2)) list.push({'title':o.substr(0,1).toUpperCase()+o.substr(1,)+'set','value':objects[o].elevation[i][0].substr(11,5)});
			}
			this.paper.path(objects[o].path).attr({'stroke':objects[o].colour,'stroke-width':2,'stroke-dasharray':'8 4','fill':'none'});
		}
		html = '';
		list.sort(function(a, b) {
			if(a.value < b.value) return -1;
			else return 1;
		});


		for(var i = 0; i < list.length; i++){
			html += '<li>'+list[i].title+': '+list[i].value+'</li>';
		}

		if(html) S('#times').html('<ul>'+html+'</ul>');
		this.paper.draw();
		S('#sky svg').css({'overflow':'unset'});
		
		console.log('Run time: '+(new Date() - now)+' ms');

		return;
	}


	return this;
}


S(document).ready(function(){
	

	app = new Application({});
	app.setGeo(53.95931,-1.53505);
	
	app.setDate();

});