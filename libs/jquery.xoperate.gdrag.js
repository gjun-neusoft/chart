(function(){
    $.fn.gdrag = function(...ars){
        $(this).XOperate()
            .on('operatemove', (evt, data)=>{
                ars[0](data.moveX, data.moveY, data.clientX, data.clientY, data.offsetX, data.offsetY)
            })
            .on('operatestart', (evt, data)=>{
                ars[1](data.clientX, data.clientY, data.target)
            })
            .on('operateend', (evt, data)=>{
                const ret = {...data, x: data.clientX, y: data.clientY}
                ars[2](ret)
            })
        return this;
    }
})()



