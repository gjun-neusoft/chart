#### 波线图表的组件

组件调用方式：

```js
//组件参数
const opts = {
            height: 300,
            el: '#chart',
            lineStroke: 'white',
            lineActiveStroke: '#82EF51',
            circleFill: 'white',
            circleActiveFill: '#82EF51',
            xTouchSide: false,
            data: data3,//组件依赖的数据
            navLabelX: {
                show: true,
                text: 'CT',
                color: 'white',
                size: 12,
                type: 'int'
            },
            navLabelY: {
                show: true,
                text: 'Alpha',
                color: 'white',
                size: 12,
                type: 'float-2'
            },
            styles: {
				margin: { //图表距离 wrapper 的边距
					top: 10,
					left: 80,
					right: 20,
					bottom: 30,
                },
                backgroundColor: '#333'
            },
            xAxis: {//x轴
				min: 0, //横向轴起始值
				max: 1500, //横向轴结束值
				grid: 13, //横向平分多少格
                zoom: true, //缩放操作，true 可以，false 不可以
                scale: 10,
                outsideMin: 0,
                outsideMax: 0,
				drag: true, //轴拖拽（在轴上水平拖拽，改变 xAxis.min，xAxis.max，同时触发 onAxisChange 回调）
			},
			yAxis: {//y轴
				min: 0,
				max: 1,
				grid: 4,
				zoom: true,
                drag:true,
                scale: 0.1,
                outsideMin: 0,
                outsideMax: 1,
            },
            handleBarSize: 10,
            handleBarX: $('#chart').width() - 60,
            handleBarY: $('#chart').height() + 20,
            onAxisChange: function(data){
                // console.log(data)
            }
        }
new ProtocolEditorChart(opts)
```

组件参数说明：

```js
options: {
    el://type: [String] ,组件实例化的dom容器
    width:'' //type: [String]，宽度(px), 空字符串值，自动适应el容器尺寸
    height: ''//type: [String]，高度
    data: //type: [Array]，组件依赖数据，下面会有数据格式介绍
    dataBg://type: [Array]，背景数量统计数据
    xTouchSide: //type: [Boolean]， X轴触边状态标识 ，false-未触边，true-触边
    lineStroke: //type: [String]， 连接线的颜色
    lineActiveStroke: //type: [String]，连接线激活状态颜色 
    styles:{//type: [Object]，图表窗口样式，目前提供margin边距，backgroundColor背景色
        margin: {
            top: 
            left: 
            right:
            bottom:
        },
        backgroundColor: //type: [Strgin]，背景色
    }，
    navLabelX: {//跟随鼠标X轴水平定位线的提示标签配置
    	show://type: [Boolean]，显示或隐藏标签，true-显示，false-隐藏
        text: //type: [String], 标签内容
        type://type: [String]，标签数据类型，Int-整型，float浮点型，float-n[n替换成需要保留的小数位数，此处参数类型不区分大小写]
        color://type:[String]，标签字体颜色 
        size://type:[Number]，标签字体大小
    },
    navLabelY:{//跟随鼠标y轴水平定位线的提示标签配置
        ...
        //此处参数及类型同上navLabelX
    },
    xAxis:{//x轴刻度配置
        min://type[Number]，x轴起始值，最小值
        max://type[Number]，y轴结束值，最大值
        grid://type[Number]，x轴平分，等分数量 
        zoom://type[Boolean]，是否缩放操作,true-允许缩放，false-不允许缩放
        drag://type[Boolean],是否允许拖拽，true-允许，false-不允许
        scale://type[Number]，每次缩放的步长
        outsideMin://type[Number]，缩放的最小限定范围
        outsideMax://type[Number]，缩放的最大限定范围
    },
    yAxis:{//y轴刻度配置
        ...
        //此处参数及类型同上xAxis
    },
    handleBarSize://type[Number]，缩放操作句柄的大小
    handleBarX://type[Number],缩放操作句柄位置的x坐标
    handleBarY://type[Number],缩放操作句柄位置的y坐标
    onPointDrag:(points, groupIndex, pointIndex){}//type[function]，点拖拽的回调方法，一个点拖拽时触发 points = this.data， groupIndex 拖拽点所在线组的index, pointIndex 拖拽点所在线中的index
    onPathDrag：(points, groupIndex){} //type[function],线拖拽的回调，/线拖拽触发 groupIndex = 拖拽点所在线组的index
    onAxisChange:(data){}//type[function],轴向数据发生改变事件（水平、垂直轴的拖动，区间的改变） data = {xAxis: {min: 0, max: 888}} 或者 data= {yAxis: {min: 0, max: 50}};， 执行setOption相关操作会触发此事件 
}

```

组件数据data格式:

```js
const data  =[
                    {
                        data: [//这是一组点数据，会根据这组点数据，将它们连接
                            {x: 100, y: 100}, //这是一个点数据，
                            {x: 400, y: 200},
                            {x: 700, y: 300}, 
                            {x: 900, y: 600},
                            {x: 1000, y: 900},
                            {x: 1200, y: 1200}
                        ]
                    },
                    {
                        data: [
                            {x: 1700, y: 1900}, 
                            {x: 1900, y: 200},
                            {x: 2200, y: 800}, 
                            {x: 2400, y: 400},
                            {x: 2600, y: 300},
                            {x: 3000, y: 1500}
                        ]
                    }
                ]
//注：这里的点数据，应该与参数中xAxis和yAxis的min、max对应。就是说数据中点的值要在参数限定范围内。
```

