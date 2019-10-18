(function(){

	/**
	 * XOperate
	 * @version 1.0.0
	 * @update 2019/04/29
	 * https://github.com/aiv367/jquery.xoperate
	 */
	$.fn.XOperate = function(opts){

		let $this = $(this);
		let $window = $(window);
		let touchNames = ['mouseLeft', 'mouseMid', 'mouseRight', 'finger', 'pen'];
		let time = 0;
	
		//处理多 dom 情况
		if($this.length>1){
			$this.each((i, el)=>{
				$(el).XOperate(opts);
			});
			return $this;
		}
	
		//处理已经执行过 xOperate 的情况
		if($this.data('_xoperate')){
			return false;
		}
		$this.data('_xoperate', true);
	
		//参数
		opts = $.extend(true, {
			moveEventTime: 0 // 设置move事件触发间隔时间
		}, opts);
	
		$this.on('touchstart mousedown', startEvt => {
	
			startEvt.preventDefault();
			let pointEvt = startEvt;
	
			if(startEvt.type === 'touchstart'){
				pointEvt = startEvt.touches[0];
			}
	
			let touchCode = startEvt.type === 'touchstart' ? 3 : startEvt.button; //3 是手指
			let thisOffset = $this.offset(); //距离页面的距离
			let thisPosition = $this.position(); //获取相对于它最近的具有相对位置，跟Dom的正好相反
	
			//交互点数据
			let pointDataStart = {
				
				time: Date.now(),
				type: 'operatestart',
				altKey: startEvt.altKey,
				ctrlKey: startEvt.ctrlKey,
				shiftKey: startEvt.shiftKey,
				touchCode: touchCode,
				touchCodeName: touchNames[touchCode],
				
				target: startEvt.target,
				currentTarget: startEvt.currentTarget,
				currentTargetOffsetX: thisPosition.left,
				currentTargetOffsetY: thisPosition.top,
				currentTargetClientX: thisOffset.left,
				currentTargetClientY: thisOffset.top,
	
				clientX: pointEvt.clientX, //鼠标相对于浏览器可视区域的X,Y坐标（将参照点改成了浏览器内容区域的左上角），可视区域不包括工具栏和滚动条
				clientY: pointEvt.clientY, 
				offsetX: startEvt.type === 'touchstart' ? pointEvt.clientX - thisOffset.left : pointEvt.offsetX, //相对于带有定位的父盒子的坐标
				offsetY: startEvt.type === 'touchstart' ? pointEvt.clientY - thisOffset.top : pointEvt.offsetY,
	
			};
	
			//触发自定义事件
			$this.trigger($.Event('operatestart', {gesture: pointDataStart}), pointDataStart);
	
			let moveIng = moveEvt => {

				//延迟触发
				if(opts.moveEventTime){
					if(Date.now() - time < opts.moveEventTime){
						return;
					}
					time = Date.now();
				}
	
				let pointEvt = moveEvt;
				if(moveEvt.type === 'touchmove'){
					pointEvt = moveEvt.touches[0];
				}
	
				let thisOffset = $this.offset(); //距离页面的距离
	
				//交互点数据
				let pointDataMove = {
					type: 'operatemove',
					time: Date.now(),
					altKey: moveEvt.altKey,
					ctrlKey: moveEvt.ctrlKey,
					shiftKey: moveEvt.shiftKey,
					touchCode: touchCode,
					touchCodeName: touchNames[touchCode],
					target: moveEvt.target,
					currentTarget: moveEvt.currentTarget,
					clientX: pointEvt.clientX, //鼠标相对于浏览器可视区域的X,Y坐标（将参照点改成了浏览器内容区域的左上角），可视区域不包括工具栏和滚动条
					clientY: pointEvt.clientY,
					offsetX: moveEvt.type === 'touchmove' ? pointEvt.clientX - thisOffset.left : pointEvt.offsetX, //相对于带有定位的父盒子的坐标
					offsetY: moveEvt.type === 'touchmove' ? pointEvt.clientY - thisOffset.top : pointEvt.offsetY,
					moveX: pointEvt.clientX - pointDataStart.clientX,
					moveY: pointEvt.clientY - pointDataStart.clientY,
					start: pointDataStart
				};
	
				//触发自定义事件
				$this.trigger($.Event('operatemove', {gesture: pointDataMove}), pointDataMove);
	
			};
	
			let moveEnd = endEvt => {
	
				let pointEvt = endEvt;
				if(endEvt.type === 'touchend'){
					pointEvt = endEvt.changedTouches[0];
				}
	
				let thisOffset = $this.offset();
	
				//交互点数据
				let pointDataEnd = {
					type: 'operateend',
					time: Date.now(),
					altKey: endEvt.altKey,
					ctrlKey: endEvt.ctrlKey,
					shiftKey: endEvt.shiftKey,
					touchCode: touchCode,
					touchCodeName: touchNames[touchCode],
					target: endEvt.target,
					currentTarget: endEvt.currentTarget,
					clientX: pointEvt.clientX, //鼠标相对于浏览器可视区域的X,Y坐标（将参照点改成了浏览器内容区域的左上角），可视区域不包括工具栏和滚动条
					clientY: pointEvt.clientY,
					offsetX: endEvt.type === 'touchend' ? pointEvt.clientX - thisOffset.left : pointEvt.offsetX, //相对于带有定位的父盒子的坐标
					offsetY: endEvt.type === 'touchend' ? pointEvt.clientY - thisOffset.top : pointEvt.offsetY,
					moveX: pointEvt.clientX - pointDataStart.clientX,
					moveY: pointEvt.clientX - pointDataStart.clientY,
					start: pointDataStart
				};
	
				//触发自定义事件
				$this.trigger($.Event('operateend', {gesture: pointDataEnd}), pointDataEnd);
	
				$window.off('touchmove mousemove', moveIng);
				$window.off('touchend mouseup', moveEnd);
	
			};
	
			$window.on('touchmove mousemove', moveIng);
			$window.on('touchend mouseup', moveEnd);
	
		});
	
		//返回jq管道
		return $this;
	
	};
	
	//利用XOperate实现的一个拖拽插件 - 不需要可以注释掉
	/*
	demo
	$demo.xDrag();
	或者
	$demo.xDrag(data=>{

		$demo.css({
			left: data.startOffsetX + data.moveX,
			top: data.startOffsetY + data.moveY
		});

	});
	*/
	$.fn.xDrag = function(fn){
	
		let $this = $(this);
		$this.XOperate();
		
		$this.on('operatestart', (evt, data)=>{
			console.log(evt)
		})

		$this.on('operatemove', (evt, data)=>{
			
			let evtData = {
				moveX: data.moveX,
				moveY: data.moveY,
				startClientX: data.start.currentTargetClientX, //相对于浏览器可视区域的X,Y坐标
				startClientY: data.start.currentTargetClientY,
				startOffsetX: data.start.currentTargetOffsetX, //相对于带有定位的父盒子的坐标
				startOffsetY: data.start.currentTargetOffsetY
			};
	
			if(fn){
				fn(evtData);
			}else{
				$this.css({
					left: evtData.startOffsetX + evtData.moveX,
					top: evtData.startOffsetY + evtData.moveY
				});
			}
	
		});
	}

})(window.jQuery)
