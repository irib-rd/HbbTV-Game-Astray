/*
 * Application StartMenu
 * * TV Markiza
 * @author Mautilus s.r.o.
 * @version 1.0.3
 */

/*eslint no-undef: 'error' */
/*eslint no-native-reassign: 'error' */
/*eslint no-unused-vars: ['error', { 'vars': 'local' }]*/
/*global KeyEvent*/
/*global ga */
var globaltime = -1;
if (typeof KeyEvent === 'undefined') {
	KeyEvent = {};
}

Array.prototype.rotate = function(n) {
	while (this.length && n < 0) {
		n += this.length;
	}
	this.push.apply(this, this.splice(0, n));
	return this;
};

var Main = {
	visible: null,
	applications: null,
	firstStart: true,
	selectedIdx: null,
	activeId: null,
	activeSubId: null,
	isAnimate: [],
	selectedMenu: 'menu',
	timers: [],

	key: {
		RIGHT:  KeyEvent.VK_RIGHT  || 39,
		LEFT:   KeyEvent.VK_LEFT   || 37,
		UP:     KeyEvent.VK_UP     || 38,
		DOWN:   KeyEvent.VK_DOWN   || 40,
		RETURN: KeyEvent.VK_BACK   ||  8,
		ENTER:  KeyEvent.VK_ENTER  || 13,
		RED:    KeyEvent.VK_RED    || 82,
		GREEN:  KeyEvent.VK_GREEN  || 71,
		YELLOW: KeyEvent.VK_YELLOW || 89,
		BLUE:   KeyEvent.VK_BLUE   || 66,
		ZERO:   KeyEvent.VK_0      || 96
	},

	FOCUSID: 2,

	networkerror: false,
	hbbtv_init: false,


	init: function() {
		try {
			this.initVideo();
			this.elRbutton   = document.getElementById('redbutton');
			this.elBbutton   = document.getElementById('bluebutton');
			this.elCar       = document.getElementById('bluebuttonCar');
			this.elBbuttonBg = document.getElementById('bluebuttonBG');
			this.menu        = document.getElementById('menu');
			this.appmgr      = document.getElementById('appmgr');
			this.dateTime    = document.getElementById('dateTime');
			this.loadTime();
			this.loadConfig();
			this.initKeyListener();
			
			this.prepareMenu();
			try {
				this.sendCapabilities();
			} catch (e) {
				// console.error('Error send capabilities to the server' + e);
			}
			if (this.firstStart && (this.params.autostart === 'true' || getCookie('autostart') == 'true')) {
				this.firstStart = false;
				document.cookie = 'autostart=false;path=/';
				this.showMenu();
			} else {
				if ( this.config.redbutton && this.RBobj.active ) {
					this.showRButton();
				}
				if ( this.config.bluebutton && this.BBobj.active ) {
					this.showBButton();
				}
			}
			this.preloadImages();
		} catch(e) {}
		this.initApp();
	},

	loadConfig: function() {
		var url = 'config.json?t=' + Math.ceil(Math.random() * 999999);
		this.config = this.loadJSON(url);
		this.visibleItems = this.config.visibleItems ? this.config.visibleItems : 5;
		this.params = this.getUrlParams();

		this.RBobj  = this.config.redbutton[0];
		this.BBobj  = this.config.bluebutton[0];
		this.carObj = this.config.bluebutton[0].car;
		this.BGobj  = this.config.bluebutton[0].bg;
	},

	loadTime: function() {
		this.renderDate();
		setInterval( this.renderDate, 999 );
	},

	renderDate: function() {
		var days = ['یکشنبه', 'دوشنبه', 'سه شنبه', 'چهارشنبه', 'پنج شنبه', 'جمعه', 'شنبه'];
		var d = getDate(),
			m = getMonth() ,
			y = getFullYear(),
			day = getDay();
		 if(globaltime=='-1')	globaltime=d;
		else{
			globaltime.setSeconds(globaltime.getSeconds() + 1);
			d=globaltime;
		} 
	
		var hh = d.getHours(),
			mm = d.getMinutes(),
			ss = d.getSeconds(),
			hh = hh < 10 ? "0" + hh : hh,
			mm = mm < 10 ? "0" + mm : mm,
			ss = ss < 10 ? "0" + ss : ss;

		day = day < 10 ? "0" + day : day;
		m = m < 10 ? "0" + m : m;

		var html = '<span class="day" >' + days[d.getDay()] + '</span>'
			+ '<span class="separator"> | </span>'
			+ '<span class="date" dir="rtl">' + JalaliDate.gregorianToJalali(y,m,day)+ "</span>"
			+ '<span class="separator" > | </span>'
			+ '<span class="time" >' + hh + ':' + mm + ':' + ss + '</span>';

		this.dateTime.innerHTML = html;
	},

	initVideo: function() {
		var videoElem = document.getElementById('video');
		try {
			videoElem.setFullScreen(true);
		} catch (e) {
			// error switch to fullscreen
		}
		try {
			videoElem.bindToCurrentChannel();
		} catch (e) {
			//error bind element to current channel
		}
	},

	initApp: function() {
		var app, vid;

		try {
			app = this.appmgr.getOwnerApplication(document);
			app.show();
			app.activate();
		} catch (e) {
			// error getting application from application manager
		}
		try {
			app.show();
		} catch (e2) {
			// app show has been disrupted
		}
		try {
			vid = document.getElementById('video');
			vid.style.left = '0px';
			vid.style.top = '0px';
			vid.style.width = '1280px';
			vid.style.height = '720px';
		} catch (e2) {
			// error set the video dimension
		}
	},

	prepareMenu: function() {
		this.applications = this.loadJSON('apps.json');
		if (!this.applications) {
			this.showError('Vyskytla se chyba při načítání aplikace');
			return;
		}

		var defaultIdx = 0,
			i;
		var subIdx = null;
		for (i = 0; i < this.applications.length; i++) {
			if (document.referrer !== '' && this.applications[i].url == document.referrer) {
				defaultIdx = i;
				break;
			} else if (this.applications[i].defaultApp) {
				defaultIdx = i;
			}
			// test submenu items for referrers
			var subset = this.applications[i].subset;
			for (var k = 0; k < subset.length; k++) {
				if (document.referrer.indexOf(subset[k].url) !== -1) {
					defaultIdx = i;
					subIdx = k;
					this.activeSubId = k;
					this.selectedMenu = 'sub';
				}
			}
		}

		this.applications.rotate(-this.FOCUSID + defaultIdx);
		this.menudom = [];
		var container = document.getElementById('applicationlist');

		for (i = 0; i < 5; i++) {
			var app = this.applications[i];
			if (app.visible) {
				var child = this.createElement('div', 'menu_' + i, 'menuitem');

				if (app.icons) {
					var icon = this.createElement('div', null, 'menuicon' + (app.custom ? ' full' : '') );
					var imgUrl = 'images/' + (i == this.FOCUSID ? app.icons.active : app.icons.inactive);
					if (i === this.FOCUSID) {
						child.className = child.className + (this.selectedMenu === 'sub' ? ' selected' : ' focused');
						this.selectedIdx = 0;
						this.activeId = i;
					}
					icon.style.backgroundImage = 'url(' + imgUrl + ')';
					child.appendChild(icon);
				}

				var label = this.createElement('div', null, 'menutext', ( app.custom ? '' : app.name.toUpperCase() ) );
				child.appendChild(label);	

				var scope = this;
				child.addEventListener('click', function() {
					//console.log('app.url: '+app.url);
									scope.runApplication(app.url);
				});
				this.menudom[i] = child;
				container.appendChild(child);
			}
		}
		this.prepareSubmenu(subIdx);
		this.showSubmenu(this.activeId);
	},

	prepareSubmenu: function(subIdx) {
		var sublist = document.getElementById('submenulist');
		var subChild;
		var DISTANCE_ITEM = 10;
		for (var i = 0; i < this.applications.length; i++) {
			var app = this.applications[i];
			if (app.visible) {
				if (app.subset instanceof Array && app.subset.length > 0) {
					subChild = this.createElement('div', 'submenu_' + i, 'submenu');
					var offset = 640 - (app.subset.length * 384 + DISTANCE_ITEM) / 2;
					for (var j = 0; j < app.subset.length; j++) {
						var subItem = this.createElement('div', null, 'submenu-item');
						var focusBg = this.createElement('div', null, 'submenu-bg');
						var iconEl = document.createElement('img');
						if (subIdx === j) subItem.className = subItem.className + ' focused';
						iconEl.style.backgroundColor = '#2d2d42';
						subItem.appendChild(focusBg);
						if (app.subset[j].icon) {
							iconEl.src = app.subset[j].icon;
							if (app.subset[j].custom) iconEl.style.height = '180px';
						}
						subItem.appendChild(iconEl);
						if (app.subset[j].name) {
							subItem.innerHTML += '<p>' + app.subset[j].name.toUpperCase() + '</p>';
						}
						subItem.style.left = offset + 'px';
						offset += (384 + DISTANCE_ITEM); // width plus border
						subChild.appendChild(subItem);
					}
				}
				if (subChild) sublist.appendChild(subChild);
			}
		}
	},

	moveMenu: function(direction) {
		var applicationsLength = this.applications.length, i, newPosition, app;

		if (this.selectedMenu === 'menu') {
			this.hideSubmenu(this.activeId);
			this.selectedIdx = (this.selectedIdx + direction) % applicationsLength;
			for (i = 0; i < this.visibleItems; i++) {
				newPosition = (applicationsLength + this.selectedIdx + i) % applicationsLength;
				app = this.applications[newPosition];
				this.menudom[i].children[0].style.backgroundImage = 'url(images/' + (i === this.FOCUSID ? app.icons.active : app.icons.inactive) + ')';
				this.menudom[i].children[0].className = 'menuicon' + (app.custom ? ' full' : '');
				if (i === this.FOCUSID) this.activeId = newPosition;
				this.menudom[i].children[1].textContent = ( app.custom ? ' ' : app.name.toUpperCase() );
			}
			this.showSubmenu(this.activeId);
		} else {
			var submenu = document.getElementById('submenu_' + this.activeId);
			removeClass(submenu.children[this.activeSubId], 'focused');
			this.activeSubId = (this.activeSubId + direction) % submenu.children.length;
			if (this.activeSubId < 0) this.activeSubId = submenu.children.length - 1;
			addClass(submenu.children[this.activeSubId], 'focused');
		}
	},

	selectMenu: function(type) {
		var menu = document.getElementById('applicationlist');
		var submenu = document.getElementById('submenu_' + this.activeId);
		if (!submenu) return;

		if (type === 'sub') {
			var item = menu.getElementsByClassName('focused');
			addClass(item[0], 'selected');
			removeClass(item[0], 'focused');
			this.activeSubId = this.activeSubId ? this.activeSubId : 0;
			if (this.activeSubId > submenu.children.length - 1) this.activeSubId = 0;
			addClass(submenu.children[this.activeSubId], 'focused');
			this.selectedMenu = 'sub';
		} else {
			removeClass(menu.children[this.FOCUSID], 'selected');
			addClass(menu.children[this.FOCUSID], 'focused');
			var subitem = submenu.getElementsByClassName('focused');
			removeClass(subitem[0], 'focused');
			this.selectedMenu = 'menu';
		}
	},

	showSubmenu: function(id) {
		var submenu = document.getElementById('submenu_' + id);
		if (submenu) {
			addClass(this.dateTime,'bigger');
			var container = document.getElementsByClassName('titlemenu');
			container[0].className += ' bigger';
			submenu.style.display = 'block';
		}
	},

	hideSubmenu: function() {
		var submenu = document.getElementById('submenu_' + this.activeId);
		if (submenu) {
			removeClass(this.dateTime,'bigger');
			var container = document.getElementsByClassName('titlemenu');
			container[0].className = 'titlemenu';
			submenu.style.display = 'none';
		}
	},

	preloadImages: function() {
		var applicationsLength = this.applications.length;
		var i, appIcons;

		this.a_images = new Array();
		this.i_images = new Array();
		for (i = 0; i < applicationsLength; i++) {
			this.a_images[i] = new Image();
			this.i_images[i] = new Image();
			appIcons = this.applications[i].icons;
			this.a_images[i].src = 'images/' + appIcons.active;
			this.i_images[i].src = 'images/' + appIcons.inactive;
		}
		return true;
	},

	setKeySet: function(mask) {
		var elemcfg, app;
		elemcfg = document.getElementById('oipfcfg');
		try {
			elemcfg.keyset.value = mask;
		} catch (e) {
			// open
		}
		try {
			elemcfg.keyset.setValue(mask);
		} catch (e) {
			//open
		}
		try {
			app = this.appmgr.getOwnerApplication(document);
			app.privateData.keyset.setValue(mask);
			app.privateData.keyset.value = mask;
		} catch (e) {
			// catch error
		}
	},

	initKeyListener: function() {
		var scope = this;
		document.addEventListener('keydown', function(e) {
			if (scope.handleKeyCode(e.keyCode)) {
				e.preventDefault();
			}
		}, false);

		this.setKeySet( 0x1 + 0x8 ); // ColorKeys and Cursors
	},

	handleKeyCode: function(kc) {
		if (kc == this.key.RED) {
			this.runApplication("../redbutton/index.php");
			/* this.handleRedKey(); */
			return true;
		} else if (kc == this.key.GREEN) {
			//ga('send', 'event', 'runApplication', this.applications[0].name+'quick');
			//this.runApplication(this.applications[0].url);
			return true;
		} else if (kc == this.key.BLUE) {
			//ga('send', 'event', 'runApplication', this.applications[1].name+'quick');
			this.handleBlueKey();
			return true;
		} else if (kc == this.key.YELLOW) {

			return true;
		} else if (kc == this.key.ENTER) {
			this.handleEnterKey();
			return true;
		} else if (kc == this.key.LEFT) {
			this.moveMenu(-1);
			return true;
		} else if (kc == this.key.RIGHT) {
			this.moveMenu(1);
			return true;
		} else if (kc == this.key.UP) {
			this.selectMenu('sub');
			return true;
		} else if (kc == this.key.DOWN) {
			this.selectMenu('main');
			return true;
		}

		return false;
	},


	/*
	 * Key handlers
	 */
	handleEnterKey: function() {
		var app;
		if (!this.visible) return;
		app = this.applications[this.activeId];
		if (this.selectedMenu === 'menu') {
			if (app.url === '' || !app.url) {
				this.selectMenu('sub');
				return true;
			}
			
			this.runApplication(app.url);
		}
		if (this.selectedMenu === 'sub') {
			var item = app.subset[this.activeSubId];
			
			this.runApplication(item.url);
		}
	},

	handleRedKey: function() {
		if ( this.visible ) {
			this.hideMenu();
		} else if ( this.isVisibleRB() ) {
			this.showMenu();
		} else {
			this.showRButton();
		}
	},

	handleBlueKey: function() {
		if ( this.visible ) {  // menu is open
			this.runApplication( this.BBobj.app );
		} else if ( this.isVisibleBB() ) {
			this.forceHhideBB();
			this.runApplication( this.BBobj.app );
		} else {
			this.showBButton();
		}
	},

	/*
	 Init Google analytics
	 */
	initGA: function() {
		
	},

	sendCapabilities: function() {
		var vid, chList, ga_params = {};
		vid = document.getElementById('video');
		chList = null;
		// Try to get channelList
		try {
			chList = vid.getChannelConfig().channelList;
			ga_params.channelList = chList;
		} catch (e) {
			chList = null;
		}

		// Get current Channel and information
		try {
			ga_params.channelName = vid.currentChannel.name;
			ga_params.channelCCID = vid.currentChannel.ccid;
			ga_params.channelDescription = vid.currentChannel.description;
			ga_params.channelONID = vid.currentChannel.onid;
			ga_params.channelSID = vid.currentChannel.sid;
			ga_params.channelTSID = vid.currentChannel.tsid;
			ga_params.cookieEnabled = navigator.cookieEnabled;
			ga_params.userAgent = navigator.userAgent;

		} catch (e) {
			// error getting information from current channel
		}

		// Get present EIT event
		try {
			ga_params.EITEvent = vid.programmes[0].name;
		} catch (e) {
			// error get current event information table
		}


		try {
			var oipfcfg = document.getElementById('oipfcfg');
			var config = oipfcfg.configuration;
		
		} catch (e) {
			// error getting HbbTV configuration properties
		}
	},

	/*
	 DOM elements functions
	 */

	createElement: function(tag, id, className, content) {
		var elem = document.createElement(tag);
		if (id) elem.id = id;
		if (className) elem.className = className;
		if (content) {
			var node = document.createTextNode(content);
			elem.appendChild(node);
		}
		return elem;
	},

	hideElement: function( element, duration ) {
		var scope = this;
		
		this.timers.push( setTimeout( function() {
			element.style.display = 'none';
		}, duration ) );
	},

	clearTimers: function() {
		var scope = this;

		this.timers.forEach( function( timer, i ) {
			clearTimeout( timer );
			scope.timers[ i ] = null;
			// clearInterval( timer );
		});
	},


	showMenu: function() {
		this.menu.style.display = 'block';
		this.visible = true;
		this.forceHideRB();
		this.forceHhideBB();
		this.setKeySet( 0x1 + 0x2 + 0x4 + 0x8 + 0x10 );  // ColorKeys and Cursors
	},
	hideMenu: function() {
		this.menu.style.display = 'none';
		this.visible = false;
		this.setKeySet( 0x1 + 0x8 );  // R + B
		//this.appmgr      = document.getElementById('appmgr');
		//app = this.appmgr.getOwnerApplication(document);
		//app.destroyApplication();
	},


	showRButton: function() {
		this.showButton( this.RBobj, this.elRbutton );
	},
	showBButton: function() {
		!this.isVisibleRB && this.showRButton();
		this.showButton( this.carObj, this.elCar );
		this.showButton( this.BGobj,  this.elBbuttonBg );
		this.showButton( this.BBobj,  this.elBbutton );
	},


	forceHideRB: function() {
		this.clearTimers();
		this.elRbutton.style.display = 'none';
	},
	forceHhideBB: function() {
		this.clearTimers();
		this.elBbuttonBg.style.display = 'none';
		this.elCar.style.display       = 'none';
		this.elBbutton.style.display   = 'none';
	},


	showButton: function(buttonObj, element) {
		// console.log('showButton')
		var scope = this;
		var image = new Image();
		image.src = buttonObj.image;
		image.onload = function() {
			scope._onLoadedImage(image, buttonObj, element);
		};

		if (image.width && image.height && element.style.display === 'none') {
			scope._onLoadedImage(image, buttonObj, element);
		}

		element.style.backgroundImage = 'url(' + buttonObj.image + ')';

		if (buttonObj.position_settings) {
			var positon = buttonObj.position_settings;
			if (positon.bottom) element.style.bottom = positon.bottom;
			if (positon.right && buttonObj.dynamic_settings && !buttonObj.dynamic_settings.animate) element.style.right = positon.right;
			if (positon.top) this.rbutton.style.top = positon.top;
			if (positon.left && buttonObj.dynamic_settings && !buttonObj.dynamic_settings.animate) element.style.left = positon.left;
		}
		this.hideElement(element, buttonObj.dynamic_settings.duration ? buttonObj.dynamic_settings.duration : 5000);
	},

	_onLoadedImage: function(image, buttonObj, element) {
		// console.log('_onLoadedImage')
		if ( this.visible ) { return };  // don't start the animations of RB/BB if the menu was already shown

		var width = image.width,
			height = image.height;
		element.style.display = 'block';
		buttonObj.width = width, buttonObj.height = height;
		element.style.width = width + 'px';
		element.style.height = height + 'px';
		if (buttonObj.dynamic_settings && buttonObj.dynamic_settings.animate) {
			if ( buttonObj.dynamic_settings.style === 'opacity') {
				this.timers.push( animation(element, {
					styl:     'opacity',
					from:     0,
					to:       1,
					delay:    buttonObj.dynamic_settings.delay,
					duration: buttonObj.dynamic_settings.animationspeed
				}) );
			} else {
				this.timers.push( animation(element, {
					styl:     'right',
					from:     -width,
					to:       0,
					delay:    buttonObj.dynamic_settings.delay,
					duration: buttonObj.dynamic_settings.animationspeed
				}) );
			}
		}
	},



	isVisibleRB: function() {
		return this.elRbutton.style.display === 'block';
	},
	isVisibleBB: function() {
		return this.elBbutton.style.display === 'block';
	},

	/*
	 Utils
	 */
	runApplication: function( url ) {
		this.hideMenu();
		document.location.href = url;
	},

	/**
	 * Get Parameter from URL
	 *
	 * @private
	 */
	getUrlParams: function() {
		var params = {};
		window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi,
			function(str, key, value) {
				params[key] = value;
			});
		return params;
	},

	loadJSON: function(url) {
		var request, response, json;

		request = new XMLHttpRequest();
		request.open('GET', url, false);
		request.setRequestHeader('Cache-Control', 'no-cache');
		request.send(null);
		response = request.responseText;

		if (response == '{}' || request.status == 404) {
			return null;
		}
		try {
			json = JSON.parse(response);
		} catch (e) {
			// error parse incoming data
		}
		return json;
	}
};



/*
Animation methods
*/
function animation(element, param, callback) {
	var delta;
	var scope = this;
	delta = function(p) {
		return p;
	};
	element.style[param.styl] = param.from + ( param.styl === 'opacity' ? '' : 'px' );
	return setTimeout( function() {
			//console.log(' '+element.id+' '+param.duration+' '+param.from+' '+param.to+' '+param.styl+' '+scope.animate);
			scope.animate({
				id: element.id,
				delay: 10,
				duration: param.duration || 1000, // 1 second defaul
				delta: delta,
				step: function(delta) {
					var absStep = param.from + (param.to - param.from) * delta + ( param.styl === 'opacity' ? '' : 'px' );
					element.style[param.styl] = absStep;
				},
				onFinish: function() {
					//if (param.to < 0){
					//    element.setAttribute('style', param.styl+': ' + parseInt(param.to) + 'px; display: none');
					//}
					callback && callback();
				}
			});
		}, param.delay || 0 );
}

function animate(opts) {
	var start = new Date();
	//var scope = this;
	//var id =  opts.id;

	var animateInterval = setInterval(function() {
		var timePassed = new Date() - start;
		var progress = timePassed / opts.duration;

		if (progress > 1) progress = 1;

		var delta = opts.delta(progress);
		opts.step(delta);

		if (progress == 1) {
			clearInterval(animateInterval);
			if (opts.onFinish) opts.onFinish();
		}
	}, opts.delay || 10);
}



/*
 HELPERS
 */
function removeClass(element, classname) {
	var cn = element.className;
	//var rxp = new RegExp( '/\b'+classname+'\b', 'g' );
	cn = cn.replace(new RegExp('\\b' + classname + '\\b'), '');
	element.className = cn;
}

function addClass(element, classname) {
	var cn = element.className;
	//test for existance
	if (cn.indexOf(classname) != -1) {
		return;
	}
	//add a space if the element already has class
	if (cn != '') {
		classname = ' ' + classname;
	}
	element.className = cn + classname;
}

function getCookie(cname) {
	var name = cname + "=";
	var ca = document.cookie.split(';');
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}
