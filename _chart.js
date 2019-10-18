class Circle {
	constructor(opts){
		const {el, x, y, r, fill, drag, hover, stroke, strokeWidth, tag} = {...opts}
		this.svg = null								//用来存储snap实例
		this.el = el								//组件包装盒，如果 是svg会直接实现snap，如果 不是svg会在el下创建一个id=SVG的dom并进行snap实例
		this.circle = null
		this.x = x || 0								//x坐标
		this.y = y || 0								//y坐标
		this.r = r || 5								//半径
		this.fill = fill || 'rgba(255,255,255,1)'	//填充色

		this.stroke = stroke || 'white'				//边框大小
		this.strokeWidth = strokeWidth || 1			//边框颜色 
		this.drag = drag || []						//拖拽回调，事件对应数组下标，start-0   move-1   end-2
		this.hover = hover || [] 					//鼠标悬浮回调，事件对应数组下标, enter - 0,   leave - 1
		this.tag = tag || ''						//类的唯一标识
		this.state = {
			isDrag : true,							//是否允许拖拽开关	
			active : false,							//当前状态hover
			onDrag: false
		}
		
		this.init()
	}
	/**
	 * 初始化
	 */
	init(){
		this.create()
		this._drag()
		this._hover()
	}
	/**
	 * 创建组件 
	 * beforeCreate和afterCreate 必须传Promise才会出发组件生命周期
	 * @param {*} beforeCreate type[Promise]
	 * @param {*} afterCreate  type[Promise]
	 */
	create(beforeCreate, afterCreate){
		beforeCreate && beforeCreate()
		const tagName = $(this.el).tagName || $(this.el)[0].tagName
		if(tagName == 'svg'){
			this.svg = Snap(this.el)
		}else{
			const _svg = '<svg id="SVG" class="pointSVG"></svg>'
			//保证svg容器唯一
			if($(this.el).find('.pointSVG').length > 0){
				this.svg = Snap('#SVG')
			}else{
				$(this.el).append(_svg)
				this.svg = Snap('#SVG')
			}
		}
		this.circle = this.svg.paper.circle(this.x, this.y, this.r).attr({
			'fill': this.fill,
			'stroke': this.stroke,
			'strokeWidth': this.strokeWidth,
			'id': 'circles'
		})
		afterCreate && afterCreate()
	}
	setPoint(opts){
		const {x, y, r, stroke, fill, strokeWidth} = {...opts}
		this.x = x || this.x
		this.y = y || this.y
		this.r = r || this.r
		this.stroke = stroke || this.stroke
		this.fill = fill || this.fill
		this.strokeWidth = strokeWidth || this.strokeWidth
		
		this.refresh()
	}
	refresh(){
		this.circle.attr({
			'cx': this.x,
			'cy': this.y,
			'fill': this.fill,
			'stroke': this.stroke,
			'strokeWidth': this.strokeWidth
		})
	}

	_drag(){
		if(!this.state.isDrag) return false
		const isArray = Array.isArray(this.drag)
		if(isArray){
			if(this.drag.length > 3) {
				console.error('drag参数数量不对');
				return false
			}
			const _start = this.drag[0].bind(this) || function(){},
				  _move = this.drag[1].bind(this) || function(){},
				  _end = this.drag[2].bind(this) || function(){}
			$(this.circle.node).gdrag(_move, _start, _end)
		}else{
			console.error('拖拽方法drag参数类型不对')
		}
	}
	_hover(){
		const isArray = Array.isArray(this.hover)
		if(isArray){
			if(this.hover.length > 2){
				console.error('hover参数数量不对')
				return false
			}
			$(this.circle.node)
			.on('mouseenter', (evt)=>{
				this.state.active = true
				this.hover[0]&&this.hover[0](evt.currentTarget)
			})
			.on('mouseleave', (evt)=>{
				this.state.active = false
				this.hover[1]&&this.hover[1](evt.currentTarget)
			})
		}else{
			console.error('hover参数类型不对')
		}
	}

}

class ProtocolEditorChart {
	constructor(opts){
		this.pointsArr = [];
		this.svg = null;
		this.lines = [];
		this.linesBG = [];
		this.temp = {};					//缓存数据
		//状态标识存储
		this.state = {
			isTouchSideY: false,		//
			curTargetType: '',
			touchSideType: {			//触边类型	[true 触边， false 未触边]
				minX: false,			//触x轴最小边 
				maxX: false,			//触x軕最大边
				minY: false,			//触y轴最小边
				maxY: false				//触y轴最大边
			},
			ctNavState: false,			//十字定位线的移动状态，用来判断移动过程中是否与线和点重合，解决定位线与点和线之间mouseover事件响应冲突，即：当在点或线上over时，定位线隐藏。true：重合，此时只响应点与线上的over状态，否则只响应定位线状态	
			isDrag: false				//当前操作是否是拖拽
		};
		//数据对像存储
		this.store = {
			width: 0, 
			poslineData: [],	//用来存储转换后的数据
			per_x: 0,			//X轴的步长
			per_y: 0,
			posDisData: [],		//点之间的dis距离存储，用来处理一组点触边时数据计算
			vLine: null,		//跟随鼠标的垂直辅助线导航
			hLine: null,		//跟随鼠标的水平辅助线导航
			navCTLabel: null,	//ctTextLabel
			navAlphaLabel: null,	//alphatextLabel
			groupBG: null,		//背景网格
			navLines: null,		//十字定位线group
			handleBarGroup: null,	//操作手柄
			zoomInX: null,		//X轴缩小
			zoomOutX: null,		//x轴放大
			zoomInY: null,		//y轴缩小
			zoomOutY: null		//y轴放大
		}			
		this._setElement(opts);
		this.setOptions(opts);
	}
	/**
	 * 事件绑定
	 */
	_bind(){
		const _this = this
		$(this.svg.node).off('mousewheel').on('mousewheel', (evt)=>{
			if(evt.originalEvent.wheelDelta < 0) {
				const retMinX = _this.opts.xAxis.min + _this.opts.xAxis.scale,
					  retMaxX = _this.opts.xAxis.max - _this.opts.xAxis.scale;
				//如果x轴在绽放过程中，最大最小值交叉了，则return
				if(retMinX >= retMaxX - _this.opts.xAxis.scale) return
				if(_this.opts.xAxis.outsideMin !== 0 && retMinX < _this.opts.xAxis.outsideMin) {
					_this.setOptions({xAxis:{min: _this.opts.xAxis.outsideMin}})
				}else{
					_this.setOptions({xAxis:{min: retMinX, max: retMaxX}})
				}
				const retMinY = _this.opts.yAxis.min + _this.opts.yAxis.scale,
					  retMaxY = _this.opts.yAxis.max - _this.opts.yAxis.scale;
				//如果Y轴在绽放过程中，最大最小值交叉了，则return
				if(retMinY >= retMaxY - _this.opts.yAxis.scale) return
				if(_this.opts.yAxis.outsideMin !== 0 && retMinY < _this.opts.yAxis.outsideMin) {
					_this.setOptions({yAxis: {min: _this.opts.yAxis.outsideMin}})
				}else{
					_this.setOptions({yAxis:{min: retMinY, max: retMaxY}})
				}
					  
			}else if(evt.originalEvent.wheelDelta > 0) {
				const retMinX = _this.opts.xAxis.min - _this.opts.xAxis.scale,
					  retMaxX = _this.opts.xAxis.max + _this.opts.xAxis.scale;
				if(_this.opts.xAxis.outsideMax !== 0 && retMaxX > _this.opts.xAxis.outsideMax){
					_this.setOptions({xAxis: {max: _this.opts.xAxis.outsideMax}})
				}else{
					_this.setOptions({xAxis:{min: retMinX, max: retMaxX}})
				}
				const retMinY = _this.opts.yAxis.min - _this.opts.yAxis.scale,
					  retMaxY = _this.opts.yAxis.max + _this.opts.yAxis.scale;
				if(_this.opts.yAxis.outsideMax !== 0 && retMaxY > _this.opts.yAxis.outsideMax) {
					_this.setOptions({yAxis: {max: _this.opts.yAxis.outsideMax}})
				}else{
					_this.setOptions({yAxis: {min: retMinY, max: retMaxY}})
				}
			}
		})
	}
	/**
	 * 初始化罩层
	 */
	_initMask(){
		const $mask = $('#mask'),
			  $rect = $mask.find('rect'),
			  $svg = this.$wrapper.find('svg'),
			  $top = $svg.find('.top'),
			  $bottom = $svg.find('.bottom'),
			  $left = $svg.find('.left'),
			  $right = $svg.find('.right');
		$rect.attr({'width': '100%', 'height': $svg.height()})
		$top.attr({'x': 0, 'y': 0, 'width': '100%', 'height': this.opts.styles.margin.top})
		$bottom.attr({'x': 0, 'y': $(this.svg.node).height() - this.opts.styles.margin.bottom, 'width': '100%', 'height': this.opts.styles.margin.bottom})
		$left.attr({'x': 0, 'y': 0, 'width': this.opts.styles.margin.left, 'height': $(this.svg.node).height() })
		$right.attr({'x': this.store.width + this.opts.styles.margin.left, 'y': 0, 'width':this.opts.styles.margin.right, 'height': $(this.svg.node).height()})
		$svg.append($top, $bottom, $left, $right)
	}
	/**
	 * 初始化组件dom结构 
	 * @param {*} opts 
	 */
	_setElement(opts){
		this.$el = $(opts.el);
		//一定要给snap指定一个id
		this.$wrapper = $(`<div class="protocoleditor_chart"><svg id="SVG" height=${opts.height || this.$el.height()}px width="100%">
			<defs>
				<mask id="mask">
					<rect x="0" y="0" width="100" height="200" fill="white"/>
				</mask>   
			</defs>

				<rect class="top" x="0" y="0" width="100%" height="50" fill="${opts.styles.backgroundColor}" mask="url(#mask)"/>
				<rect class="bottom" x="0" y="0" width="100%" height="50" fill="${opts.styles.backgroundColor}" mask="url(#mask)"/>
				<rect class="left" x="0" y="0" width="100%" height="50" fill="${opts.styles.backgroundColor}" mask="url(#mask)"/>
				<rect class="right" x="0" y="0" width="100%" height="50" fill="${opts.styles.backgroundColor}" mask="url(#mask)"/>
		</svg></div>`);
		this.$el.append(this.$wrapper);
		this.svg = new Snap('#'+this.$wrapper.find('svg')[0].id);
	}
	/**
	 * 创建背景
	 */
	_createBG(){
		$(this.svg.node).find('.kd-h-text,.kd-v-text,.kd-h, .kd-v').remove()
		const l1 = (this.opts.xAxis.max - this.opts.xAxis.min) / this.opts.xAxis.grid * this.store.per_x,
			  l2 = (this.opts.yAxis.max - this.opts.yAxis.min) / this.opts.yAxis.grid * this.store.per_y;
		const left = this.opts.styles.margin.left,
			  right = this.opts.styles.margin.right,
			  bottom = this.opts.styles.margin.bottom,
			  top = this.opts.styles.margin.top;
		if(this.store.groupBG){
			$(this.store.groupBG.node).empty()
		}else{
			this.store.groupBG = this.svg.paper.group().attr({
				'class': 'bgTable'
			});
		}
		//创建x轴刻度
		for(let i = 0; i < this.opts.xAxis.grid+1; i++){
			let line1,text,line2;
			let num = i * l1 / this.store.per_x + this.opts.xAxis.min
			num = parseInt(num)
			line1 = this.svg.paper.line(left + l1 * i, this.store.height + top - 5, left + l1 * i, this.store.height + top).attr({stroke: 'white', class: 'kd-h'})
			text = this.svg.paper.text(left -this._calcuTextFixed(num) + l1 * i, (this.store.height + top + 15), num + '').attr({fill: 'white', class: 'kd-h-text'})
			line2 = this.svg.paper.line(left + l1 * i, top, left + l1 * i, this.store.height + top).attr({stroke: '#666', class: 'kd-h-tl'})
			this.store.groupBG.add(line1, text, line2)
		}
		const kdHLine = this.svg.paper.line(left, this.store.height + top, this.store.width + left, this.store.height + top).attr({stroke: 'white', class:'kd-h-line'})
		//创建y轴刻度
		for(let i = this.opts.yAxis.grid ; i >= 0; i--){
			let line1,text,line2;
			let num = i * l2 / this.store.per_y +  + this.opts.yAxis.min
			num = parseFloat(num.toFixed(2))
			line1 = this.svg.paper.line(left, l2 * i + top, left + 5, l2 * i + top).attr({stroke: 'white', class: 'kd-v'})
			text = this.svg.paper.text(left - 10, this.store.height - l2 * i + top, num+'').attr({fill: 'white', class: 'kd-v-text', 'text-anchor':'end'})
			line2 = this.svg.paper.line(left, l2 * i + top, this.store.width + left, l2 * i + top).attr({stroke: '#666', class: 'kd-v-tl'})
			this.store.groupBG.add(line1, text, line2)
		}
		const kdVLine = this.svg.paper.line(left, top, left, this.store.height+top).attr({stroke: 'white', class:'kd-v-line'})
		this.svg.append(this.store.groupBG)
		this.store.groupBG.add(kdHLine, kdVLine)
	}
	/**
	 * 计算刻度文字的位置
	 */
	_calcuTextFixed(code){
		let v = 0;
		if(code >=0 && code <10){
			v = 5
		}else if(code >9 && code<100){
			v = 10
		}else if(code >99 && code < 1000){
			v = 15
		}else if(code > 999 && code < 10000){
			v = 20
		}
		return v
	}
	/**
	 * 创建点实例
	 */
	_createPoint(){
		//清除dom和数据
		this.pointsArr = []
		this.svg && $(this.svg.node).find('circle').remove()
		//清除完成
		const _this = this
		let circleOpts = {
			el: `#${this.svg.node.id}`,
			// el: `${this.$wrapper[0].id? this.$wrapper[0].id:this.$wrapper[0].className}`,
			fill: this.opts.circleFill,
			drag: [
				function(x,y,target){
					this.state.onDrag = true
				},
				function(x, y, cx, cy, offsetX, offsetY){
					// this.state.isDrag = true
					_this.state.curTargetType = 'circle'
					const _tag = this.tag.split('-')
					//这里的offsetX是相对于浏览器的坐标，相当于已经算完缩放比的坐标，所以需要再除以per_x算回去
					let x1 = (offsetX-_this.opts.styles.margin.left) / _this.store.per_x + _this.opts.xAxis.min,
						y1 = (_this.store.height - offsetY + _this.opts.styles.margin.top) / _this.store.per_y + _this.opts.yAxis.min;
					_this._asyncData({x: x1, y: y1, tag: this.tag})
					//是否执行碰撞操作
					_this._touchSide({tag:_tag[0]})
					_this._isCollide(this)
					_this.refresh()
					_this.opts.onPointDrag && _this.opts.onPointDrag(_this.opts.data, Number(_tag[0]), Number(_tag[1]))
				},
				function(data){
					this.state.onDrag = false
				}
			],
			hover: [
				function(target){
					_this.state.ctNavState = true
					_this.state.isEnter = true
					$(target).attr({'fill': _this.opts.circleActiveFill, 'stroke': _this.opts.circleActiveFill})

				},
				function(target){
					if(!_this.state.isDrag) _this.state.ctNavState = false
					$(target).attr({'fill': _this.opts.circleFill, 'stroke': _this.opts.circleFill})
				}
			]
		}
		
		$.each(this.opts.data, (key, points)=>{
			$.each(points.data, (k, p)=>{
				this.pointsArr.push(new Circle({...circleOpts,tag: `${key}-${k}`}))
			})
		})
	}
	/**
	 * 创建绽放手柄
	 */
	_createHandleBar(){
		if(this.store.handleBarGroup) return
		const size = this.opts.handleBarSize,
				x = this.opts.handleBarX,
				y = this.opts.handleBarY;
		this.store.zoomInX = this.svg.paper.rect(x, y + size, size, size).attr({'fill': '#ccc', 'class': 'zoomInX'})
		this.store.zoomOutX = this.svg.paper.rect(x + size * 2, y + size, size, size).attr({'fill': '#ccc', 'class': 'zoomOutX'})
		this.store.zoomInY = this.svg.paper.rect(x + size, y, size, size).attr({'fill': '#ccc', 'class': 'zoomInY'})
		this.store.zoomOutY = this.svg.paper.rect(x + size, y + size * 2, size, size).attr({'fill': '#ccc', 'class': 'zoomOutY'})
		this.store.handleBarGroup = this.svg.paper.group().attr('class', 'handleBarGroup')
		this.store.handleBarGroup.add(this.store.zoomInX, this.store.zoomOutX, this.store.zoomInY, this.store.zoomOutY)
		// this.store.handleBarGroup.drag()
		this.svg.append(this.store.handleBarGroup)
		this._bindHandleBar()

	}
	/**
	 * 操作手柄事件绑定
	 */
	_bindHandleBar(){
		const _this = this
		//鼠标over样式
		this.store.zoomInX.mouseover(function(){
			_this.store.zoomInX.attr({'fill':'#82EF51'})
		})
		this.store.zoomOutX.mouseover(function(){
			_this.store.zoomOutX.attr({'fill':'#82EF51'})
		})
		this.store.zoomInY.mouseover(function(){
			_this.store.zoomInY.attr({'fill':'#82EF51'})
		})
		this.store.zoomOutY.mouseover(function(){
			_this.store.zoomOutY.attr({'fill':'#82EF51'})
		})	
		//鼠标out样式
		this.store.zoomInX.mouseout(function(){
			_this.store.zoomInX.attr({'fill':'white'})
		})
		this.store.zoomOutX.mouseout(function(){
			_this.store.zoomOutX.attr({'fill':'white'})
		})
		this.store.zoomInY.mouseout(function(){
			_this.store.zoomInY.attr({'fill':'white'})
		})
		this.store.zoomOutY.mouseout(function(){
			_this.store.zoomOutY.attr({'fill':'white'})
		})	
		//鼠标点击事件
		this.store.zoomOutX.click(function(){
			const ret = _this.opts.xAxis.max - _this.opts.xAxis.scale
			if(_this.opts.xAxis.outsideMin !== 0 && ret < _this.opts.xAxis.outsideMin) {
				_this.setOptions({xAxis:{max: _this.opts.xAxis.outsideMin}})
			}else{
				_this.setOptions({xAxis:{max: ret}})
			}
		})
		this.store.zoomInX.click(function(){
			const ret = _this.opts.xAxis.max + _this.opts.xAxis.scale
			if(_this.opts.xAxis.outsideMax !== 0 && ret > _this.opts.xAxis.outsideMax) {
				_this.setOptions({xAxis:{max: _this.opts.xAxis.outsideMax}})
			}else{
				_this.setOptions({xAxis:{max: ret}})
			}
		})
		this.store.zoomInY.click(function(){
			const ret = _this.opts.yAxis.max - _this.opts.yAxis.scale
			if(_this.opts.yAxis.outsideMin !== 0 && ret < _this.opts.yAxis.outsideMin) {
				_this.setOptions({yAxis:{max:_this.opts.yAxis.outsideMin}})
			}else{
				_this.setOptions({yAxis:{max:ret}})
			}
		})
		this.store.zoomOutY.click(function(){
			const ret = _this.opts.yAxis.max + _this.opts.yAxis.scale
			if(_this.opts.yAxis.outsideMax !== 0 && ret > _this.opts.yAxis.outsideMax) {
				_this.setOptions({yAxis:{max: _this.opts.yAxis.outsideMax}})
			}else{
				_this.setOptions({yAxis:{max: ret}})
			}
		})
	}
	/**
	 * 获取到active状态的点实例的tag值
	 */
	_getActiveTag(){
		let tag
		$.each(this.pointsArr, (index, point)=>{
			if(point.state.active){
				tag = point.tag
			}
		})
		return tag
	}
	/**
	 * 十字定位辅助线
	 */
	_createCtNav(){	
		if(this.store.navLines){
			$(this.store.navLines.node).empty()
		}else{
			this.store.navLines = this.svg.paper.group().attr({'class': 'navLines'})
		}
		this.store.vLine = this.svg.paper.line(this.opts.styles.margin.left, this.opts.styles.margin.top, this.opts.styles.margin.left, this.store.height + this.opts.styles.margin.top).attr({'stroke': 'red', 'strokeWidth': 1,'opacity': 0})
		this.store.hLine = this.svg.paper.line(this.opts.styles.margin.left, this.opts.styles.margin.top, this.store.width + this.opts.styles.margin.left, this.opts.styles.margin.top).attr({'stroke': 'red', 'strokeWidth': 1,'opacity': 0})
		this.store.navCTLabel = this.svg.paper.text(0, 0, '')
		this.store.navAlphaLabel = this.svg.paper.text(0, 0, '')
		
		
		this.store.navLines.add(this.store.vLine, this.store.hLine,this.store.navAlphaLabel,this.store.navCTLabel)
		this.svg.append(this.store.navLines)
		!this.opts.navLabelX.show && $(this.store.navCTLabel.node).remove()
		!this.opts.navLabelY.show && $(this.store.navAlphaLabel.node).remove()
		$(this.svg.node).off('mouseleave').on('mouseleave', ()=>{
			this.store.hLine.attr({'opacity': 0})
			this.store.vLine.attr({'opacity': 0})
			this.store.navCTLabel.attr({'opacity': 0})
			this.store.navAlphaLabel.attr({'opacity': 0})
		})
		$(this.svg.node).off('mousemove').on('mousemove', (evt)=>{
			if(this.state.ctNavState){
				this.store.hLine.attr({'opacity': 0})
				this.store.vLine.attr({'opacity': 0})
			}else{
				this.store.hLine.attr({'opacity': 1})
				this.store.vLine.attr({'opacity': 1})
				this.store.navCTLabel.attr({'opacity': 1})
				this.store.navAlphaLabel.attr({'opacity': 1})
			}
			let curCT = (evt.offsetX - this.opts.styles.margin.left) / this.store.per_x + this.opts.xAxis.min,								//当前CT值
				curAlpha = (this.store.height - evt.offsetY + this.opts.styles.margin.top) / this.store.per_y + this.opts.yAxis.min,		//当前透明度
				labelWidth = 25,	//当前label宽。这里的宽在dom上没有实际影响，只是用来做label右侧触边时的交互条件,因为svg中的text是流文本没有宽高，所以这里的值 相对模糊
				labelHeight = 20;
			if(curCT <= this.opts.xAxis.min) curCT = this.opts.xAxis.min
			if(curCT >= this.opts.xAxis.max) curCT = this.opts.xAxis.max
			if(curAlpha <= this.opts.yAxis.min) curAlpha = this.opts.yAxis.min
			if(curAlpha >= this.opts.yAxis.max) curAlpha = this.opts.yAxis.max

			const value = this._generateNavLabelValue({labelX: curCT, labelY:curAlpha})

			if(evt.offsetX+15+labelWidth >= this.store.width){
				this.store.navCTLabel.attr({
					'x': evt.offsetX - 80
				})
				this.store.navAlphaLabel.attr({
					'x': evt.offsetX - 80
				})
			}else{

				this.store.navCTLabel.attr({
					'x': evt.offsetX+15
				})
				this.store.navAlphaLabel.attr({
					'x': evt.offsetX+15
				})
			}
			if(evt.offsetY + this.opts.styles.margin.top + labelHeight >= this.store.height){
				this.store.navCTLabel.attr({
					'y': evt.offsetY - 20
				})
				this.store.navAlphaLabel.attr({
					'y': evt.offsetY - 5
				})
			}else{
				this.store.navCTLabel.attr({
					'y': evt.offsetY + 15
				})
				this.store.navAlphaLabel.attr({
					'y': evt.offsetY + 30
				})
			}
			if(!this.state.ctNavState){
				this.store.navCTLabel.attr({
					'text': `${this.opts.navLabelX.text}: ${value.labelX}`
				})
				this.store.navAlphaLabel.attr({
					'text': `${this.opts.navLabelY.text}: ${value.labelY}`
				})
			}else{
				const tag = this._getActiveTag()
				const data = this._getData(tag)
				!!data && this.store.navCTLabel.attr({'text': `${this.opts.navLabelX.text}: ${value.labelX}`})
				!!data && this.store.navAlphaLabel.attr({'text': `${this.opts.navLabelY.text}: ${value.labelY}`})
			}
			this.store.navCTLabel.attr({
				'font-size': this.opts.navLabelX.size,
				'fill': this.opts.navLabelX.color
			})
			this.store.navAlphaLabel.attr({
				'font-size': this.opts.navLabelY.size,
				'fill': this.opts.navLabelY.color
			})
			this._showCtNav()
			this.store.vLine.attr({
				'x1': evt.offsetX,
				'y1': this.opts.styles.margin.top,
				'x2': evt.offsetX,
				'y2': this.store.height + this.opts.styles.margin.top
			})
			this.store.hLine.attr({
				'x1': this.opts.styles.margin.left,
				'y1': evt.offsetY,
				'x2': this.store.width + this.opts.styles.margin.left,
				'y2': evt.offsetY
			})
		})
	}
	/**
	 * 生成定位线Label内容
	 * @param {} param0 
	 */
	_generateNavLabelValue({labelX = 0, labelY = 0}){
		//不区分大小写
		const arrTypeX = this.opts.navLabelX.type.split('-')
		if(arrTypeX[0] === 'Int' || arrTypeX[0] === 'INT' || arrTypeX[0] === 'int'){
			labelX = parseInt(labelX)
		}
		if(arrTypeX[0] === 'Float' || arrTypeX[0] === 'float' || arrTypeX[0] === 'FLOAT'){
			if(arrTypeX[1]){
				labelX = parseFloat(labelX.toFixed(arrTypeX[1]))
			}else{
				labelX = parseFloat(labelX)
			}
		}
		const arrTypeY = this.opts.navLabelY.type.split('-')
		if(arrTypeY[0] === 'Int' || arrTypeY[0] === 'INT' || arrTypeY[0] === 'int'){
			labelY = parseInt(labelY)
		}
		if(arrTypeY[0] === 'Float' || arrTypeY[0] === 'float' || arrTypeY[0] === 'FLOAT'){
			if(arrTypeY[1]){
				labelY = parseFloat(labelY.toFixed(arrTypeY[1]))
			}else{
				labelY = parseFloat(labelY)
			}
		}
		return {labelX: labelX, labelY: labelY}
	}
	/**
	 * 设置十字定位辅助线
	 */
	_setCtNav(x, y, label){
		if(!this.store.vLine || !this.store.hLine ){
			console.error("未创建十车辅助线")
			return false
		}
		this.store.vLine.attr({
			'x1': x,
			'y1': this.opts.styles.margin.top,
			'x2': x,
			'y2': this.store.height + this.opts.styles.margin.bottom
		})
		this.store.hLine.attr({
			'x1': this.opts.styles.margin.left,
			'y1': y,
			'x2': this.store.width + this.opts.styles.margin.right,
			'y2': y
		})
	}
	/**
	 * 显示十字定位辅助线
	 */
	_showCtNav(state = true){
		if(!state){
			$(this.store.hLine.node).attr({'opacity': 0})
			$(this.store.vLine.node).attr({'opacity': 0})

		}else{
			$(this.store.hLine.node).attr({'opacity': 1})
			$(this.store.vLine.node).attr({'opacity': 1})
		}
	}
	/**
	 * 创建线
	 */
	_createLine(){
		const _this = this
		//清除数据和dom
		$(this.svg.node).find('path').remove();
		this.lines = [];
		this.linesBG = [];
		//清除完成
		$.each(this.opts.data, (index, points)=>{
			let path = '';
			//这部分代码要提取出来一个生成path路径的方法
			path = this._getPath(points)
			this.linesBG.push(this.svg.paper.path(path).attr({
				stroke: 'rgba(255,255,255,0)',
				strokeWidth: 8,
				fill: 'none',
				groupId: index
			}))
			this.lines.push(this.svg.paper.path(path).attr({
				stroke: this.opts.lineStroke,
				fill: 'none',
				groupId: index+'BG'
			}))
		})
		const start = (cx, cy, target)=>{
			this.state.groupId = $(target).attr('groupId')
			this.temp.points_temp = []
			for(let point of this.opts.data[this.state.groupId].data){
				this.temp.points_temp.push({...point})
			}
		}
		const move = (x, y, cx, cy, offsetX, offsetY)=>{
			this.state.isDrag = true
			this.state.curTargetType = 'line'
			let outside = {
				y: false,
				x: false
			}
			$.each(this.opts.data[this.state.groupId].data, (i, p)=>{
				let tx = _this.temp.points_temp[i].x + x / _this.store.per_x,
					ty =  _this.temp.points_temp[i].y - y / _this.store.per_y;
				this._touchSide({x: tx, y: ty, tag: this.state.groupId, all: true})
				if(this.state.touchSideType.maxX || this.state.touchSideType.minX ) outside.x = true
				if(this.state.touchSideType.maxY || this.state.touchSideType.minY ) outside.y = true
			})
			$.each(this.opts.data[this.state.groupId].data, (i, p)=>{
				let tx = _this.temp.points_temp[i].x + x / _this.store.per_x,
					ty =  _this.temp.points_temp[i].y - y / _this.store.per_y;
				if(outside.x || outside.y){
					if(outside.x && !outside.y) this._asyncData({y: ty,tag: `${this.state.groupId}-${i}`})
					if(outside.y && !outside.x) this._asyncData({x: tx, tag: `${this.state.groupId}-${i}`})
				}else{
					this._asyncData({x: _this.temp.points_temp[i].x + x / _this.store.per_x, y : _this.temp.points_temp[i].y - y / _this.store.per_y, tag: `${this.state.groupId}-${i}`})
				}
			})
			this.opts.onPathDrag && this.opts.onPathDrag(this.opts.data, this.state.groupId)
			this.refresh()
		}
		const end = ()=>{
			this.state.isDrag = false
		}
		const enter = (_this)=>{
			let cur = _this.currentTarget
			$(cur).siblings("[groupId='"+$(cur).attr('groupId')+"BG']").attr({'stroke': this.opts.lineActiveStroke})
		}
		const leave = (_this)=>{
			let cur = _this.currentTarget
			!this.state.isDrag && $(cur).siblings("[groupId='"+$(cur).attr('groupId')+"BG']").attr({'stroke': this.opts.lineStroke})
		}
		//为直线绑定drag事件
		for(let lineBG of this.linesBG) {
			$(lineBG.node)
			.gdrag(move, start, end)
			.on('mouseenter', enter(this))
			.on('mouseleave', leave(this))
		}
		for(let lineBG of this.linesBG) {
			$(lineBG.node).hover(enter, leave)
		}
		//调整线与圆的dom顺序
		for(let path of $(this.svg.node).find('path')){
			$(this.store.navLines.node).after(path)
		}

	}
	/**
	 * 邻近点是否碰撞
	 */
	_isCollide(target){
		//取邻近点
		const points = this._getSublingsPointsData(target.tag)
		let cur_target = this._getCircleClass(target.tag),
			pre_target = this._getCircleClass(points[0].tag),
			next_target = this._getCircleClass(points[2].tag)
		let _tag = ''
		if(points[0] && points[1].x < points[0].x){
			this._orderData(target.tag, 'pre')
			//tag交换
			_tag = cur_target.tag
			cur_target.tag = pre_target.tag
			pre_target.tag = _tag
			return
		}
		if(points[0] && points[1].x > points[2].x){
			this._orderData(target.tag, 'next')
			//tag交换
			_tag = cur_target.tag
			cur_target.tag = next_target.tag
			next_target.tag = _tag
			return
		}
	}
	/**
	 * 触边判断
	 * 
	 * tag：当前操作的group的tag值0/1
	 */
	_touchSide({x, y, tag, all=false}){
		const curGroup = this.opts.data[tag].data
		// const curGroup = this.temp.points_temp
		if(!all){
			if(this.opts.xTouchSide && curGroup[0].x< this.opts.xAxis.min){
				curGroup[0].x = this.opts.xAxis.min
				return
			}
			if(this.opts.xTouchSide && curGroup[curGroup.length - 1].x > this.opts.xAxis.max){
				curGroup[curGroup.length - 1].x = this.opts.xAxis.max
				return
			}
			$.each(this.pointsArr, (index, point)=>{
				if(point.state.onDrag){
					let pot = this._getData(point.tag)
					if(pot.p.y > this.opts.yAxis.max){
						pot.p.y = this.opts.yAxis.max
					}
					if(pot.p.y < this.opts.yAxis.min){
						pot.p.y = this.opts.yAxis.min
					}
				}
			})
		}else{
			//x轴最小值判断
			this.state.touchSideType.minX = false
			if(this.opts.xTouchSide && x < this.opts.xAxis.min){
				this.state.touchSideType.minX = true
			}
			//x轴最大值判断
			this.state.touchSideType.maxX = false
			if(this.opts.xTouchSide && x > this.opts.xAxis.max){
				this.state.touchSideType.maxX = true
			}

			//Y轴最小值 判断
			this.state.isTouchSideY = false
			this.state.touchSideType.maxY = false
			this.state.touchSideType.minY = false
			if(y <= this.opts.yAxis.min){
				this.state.touchSideType.minY = true
			}
			//y轴最大值 判断
			if(y > this.opts.yAxis.max){
				this.state.touchSideType.maxY = true
			}
		}	
	}
	/**
	 * 数据重排
	 */
	_orderData(tag, direct){
		const _tag = tag.split('-')
		let temp
		if(direct == 'pre'){
			temp = this.opts.data[_tag[0]].data[_tag[1]]
			this.opts.data[_tag[0]].data[_tag[1]] = this.opts.data[_tag[0]].data[Number(_tag[1])-1]
			this.opts.data[_tag[0]].data[Number(_tag[1])-1] = temp
			return
		} 
		if(direct == 'next'){
			temp = this.opts.data[_tag[0]].data[_tag[1]]
			this.opts.data[_tag[0]].data[_tag[1]] = this.opts.data[_tag[0]].data[Number(_tag[1])+1]
			this.opts.data[_tag[0]].data[Number(_tag[1])+1] = temp
			return
		}
	}
	/**
	 * //取邻近点
	 * @param {*} tag type[String]
	 */
	_getSublingsPointsData(tag){
		let _tag = this._getData(tag).tag
		let arrTag = _tag.split('-')
		const p1 = this.opts.data[arrTag[0]].data[Number(arrTag[1])-1]||false,
			  p2 = this.opts.data[arrTag[0]].data[arrTag[1]],
			  p3 = this.opts.data[arrTag[0]].data[Number(arrTag[1])+1]||false
		let  p1Tag = '',p2Tag = '',p3Tag = ''
			p1Tag = this.opts.data[arrTag[0]].data[Number(arrTag[1])-1] && `${arrTag[0]}-${Number(arrTag[1])-1}`,
			p2Tag = this.opts.data[arrTag[0]].data[arrTag[1]] && `${arrTag[0]}-${arrTag[1]}`,
			p3Tag = this.opts.data[arrTag[0]].data[Number(arrTag[1])+1] && `${arrTag[0]}-${Number(arrTag[1])+1}`
			
		return [
			{...p1, tag: p1Tag},
			{...p2, tag: p2Tag},
			{...p3, tag: p3Tag}
		]
	}
	/**
	 * 同步数据
	 */
	_asyncData(opts){
		const {x, y, tag} = {...opts}
		let ret = this._getData(tag).p
		if(x) ret.x = x
		if(y) ret.y = y
	}
	/**
	 * 到参数数据opts.data 中获取数据
	 * @param  tag type[String]
	 */
	_getData(tag){
		if(tag === undefined){
			return false
		}
		let ret = ''
		let arrTag = tag.split('-')
		$.each(this.opts.data, (key,points)=>{
			if(key == arrTag[0]){
				$.each(points.data, (k, p)=>{
					if(k == arrTag[1]){
						ret = {p, tag: `${key}-${k}`}
					}
				})
			}
		})
		return ret
	}
	/**
	 * 通过tab获取对应的实例
	 */
	_getCircleClass(tag){
		let ret
		for(let Point of this.pointsArr){
			if(Point.tag == tag){
				ret = Point
			}
		}
		return ret
	}
	/**
	 * 
	 * @param {*} points  type[Array] 生成snap <path></path>字符串
	 */
	_getPath(points){

		let path = '';
		$.each(points.data, (i, p)=>{
			//首点判断
			if(i == 0){
				path += `M${p.x * this.store.per_x + this.opts.styles.margin.left - this.opts.xAxis.min * this.store.per_x} ${this.store.height + this.opts.styles.margin.top + this.opts.yAxis.min * this.store.per_y}L${p.x * this.store.per_x + this.opts.styles.margin.left - this.opts.xAxis.min * this.store.per_x} ${this.store.height - p.y * this.store.per_y + this.opts.styles.margin.top + this.opts.yAxis.min * this.store.per_y}`
			}else if(i == points.data.length-1){		//末点判断
				path += `L${p.x * this.store.per_x + this.opts.styles.margin.left - this.opts.xAxis.min * this.store.per_x} ${this.store.height - p.y * this.store.per_y + this.opts.styles.margin.top + this.opts.yAxis.min * this.store.per_y}L${p.x * this.store.per_x + this.opts.styles.margin.left - this.opts.xAxis.min * this.store.per_x} ${this.store.height + this.opts.styles.margin.top + this.opts.yAxis.min * this.store.per_y}`
			}else{
				path += `L${p.x * this.store.per_x + this.opts.styles.margin.left - this.opts.xAxis.min * this.store.per_x} ${this.store.height - p.y * this.store.per_y + this.opts.styles.margin.top + this.opts.yAxis.min * this.store.per_y}L${points.data[i+1].x * this.store.per_x + this.opts.styles.margin.left - this.opts.xAxis.min * this.store.per_x} ${this.store.height - points.data[i+1].y * this.store.per_y + this.opts.styles.margin.top + this.opts.yAxis.min * this.store.per_y}`
			}
		})
		return path
	}
	/**
	 * 设置数据
	 * @param {}} opts type[Object] 
	 */
	setOptions(opts){
		this.opts = $.extendObject(true, {
			el: '', //插件实例化的根Dom容器
			width: '', //宽度(px), 空字符串值，自动适应el容器尺寸
			height: '', //同上
			data: [], //点数据 data = [{data: [{x: 0, y: 0}, {x: 10, y: 10},...]}]
			dataBg: [], //背景数量统计数据 dataBg = [{x: 0, y: 1000},{x: 0, y: 1000},...]
			xTouchSide: false,
			lineStroke: 'white',
			lineActiveStroke: 'yellow',
			styles: {
				margin: { //图表距离 wrapper 的边距
					top: 50,
					left: 50,
					right: 50,
					bottom: 50,
				},
				backgroundColor: 'red'
			},
			navLabelX: {
				show: true,
				text: 'labelX',
				type: 'Int',	//类型： Int、Float-n， n是保留几位小数
				color: 'yellow',
				size: 12
			},
			navLabelY: {
				show: true,
				text: 'labelX',
				type: 'Int',
				color: 'blue',
				size: 12
			},
			xAxis: {//x轴
				min: 0, //横向轴起始值
				max: 1500, //横向轴结束值
				grid: 10, //横向平分多少格
				zoom: true, //缩放操作，true 可以，false 不可以
				drag: true, //轴拖拽（在轴上水平拖拽，改变 xAxis.min，xAxis.max，同时触发 onAxisChange 回调）
				scale: .1,
				outsideMin: 0,//最小边界范围
				outsideMax: 0//最大边界范围

			},
			yAxis: {//y轴
				min: 0,
				max: 1,
				grid: 4,
				zoom: true,
				drag:true,
				scale: .1,
				outsideMin: 0,
				outsideMax: 0 
			},
			handleBarSize: 10,
			onPointDrag(points, groupIndex, pointIndex){}, //一个点拖拽触发 points = this.data， groupIndex 拖拽点所在线组的index, pointIndex 拖拽点所在线中的index
			onPathDrag(points, groupIndex){}, //线拖拽触发 groupIndex = 拖拽点所在线组的index
			onAxisChange(data){}, //轴向数据发生改变事件（水平、垂直轴的拖动，区间的改变） data = {xAxis: {min: 0, max: 888}} 或者 data= {yAxis: {min: 0, max: 50}};， 执行setOption相关操作会触发吃事件

		}, this.opts, opts);
		if(opts.xAxis){
			if(opts.xAxis.min || opts.xAxis.max) this.opts.onAxisChange(this.opts)
		}
		if(opts.yAxis){
			if(opts.yAxis.min || opts.yAxis.max) this.opts.onAxisChange(this.opts)
		}
		this._CalcuStep();	//计算步长
		this._createBG();	//创建背景
		this._createCtNav();//创建定位线
		this._createPoint();//创建点
		this._createLine();//创建线
		this._initMask();//创建遮罩
		this._createHandleBar(); //创建操作手柄
		this._bind(); // 事件绑定
		//这里是特殊处理，因为刻度和文本是与背景网格在一个group里，所以这里需要在创建完遮罩层后，把这些再单独提出来，放在遮罩层上面
		$(this.svg.node).append($(this.svg.node).find('.kd-v, .kd-v-text, .kd-h, .kd-h-text'))
		//操作手柄需要在最上方
		this.svg.append(this.store.handleBarGroup)
		this.refresh(opts);
		
	}
	/**
	 * 计算步长和容器宽高
	 */
	_CalcuStep(){
		this.store.width = $(this.svg.node).width() - this.opts.styles.margin.left - this.opts.styles.margin.right
		this.store.height = $(this.svg.node).height() - this.opts.styles.margin.top - this.opts.styles.margin.bottom
		this.store.per_x = this.store.width / (this.opts.xAxis.max - this.opts.xAxis.min)
		this.store.per_y = this.store.height / (this.opts.yAxis.max - this.opts.yAxis.min)
	}
	/**
	 * 刷新
	 */
	refresh(opts){
		let _opts = opts ? opts : this.opts;
		
		this.store.posDisData = []
		$.each(this.opts.data, (index, points)=>{
			this.store.posDisData.push({
				data: []
			})
			$.each(points.data, (i, p)=>{
				//获取实例，刷新 点  active是点的hover-enter状态
				const c = this._getCircleClass(`${index}-${i}`)
				let x1 =  p.x * this.store.per_x + this.opts.styles.margin.left - this.opts.xAxis.min * this.store.per_x,
					y1 = (this.store.height - p.y * this.store.per_y) + this.opts.styles.margin.top + this.opts.yAxis.min * this.store.per_y;
				// if(this.state.isTouchSideY && this.state.curTargetType === 'line'){
				// 	//如果当前y轴方向已触边界并且当前操作元素是line
				// 	this._asyncData({y: (this.store.height - c.y + this.opts.styles.margin.top) / this.store.per_y, tag: `${index}-${i}`})
				// 	c.setPoint({x: p.x * this.store.per_x + this.opts.styles.margin.left})
				// }else{
					c.setPoint({x: x1, y: y1})
				// }
				if(c.state.active){
					c.setPoint({fill: _opts.circleActiveFill})
				}else{
					c.setPoint({fill: _opts.circleFill})
				}
			})
			//刷新 线`
			this.lines[index].attr('path', this._getPath(points))
			this.linesBG[index].attr('path', this._getPath(points))
		})
		
	}
	destroy(){
		
	}

}

// export default ProtocolEditorChart;