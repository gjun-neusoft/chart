/**
 * jquery.extendObject
 * 对象深拷贝
 * 功能跟jQuery.extend基本一直，唯一区别是，extendObject 针对 array 类型数据，是采用覆盖赋值方式
 * @version 1.0.0
 * @update 2019/06/21
 * https://github.com/aiv367/jquery.extendObject
 */
(function($){

	$.extendObject = function() {
		var options, name, src, copy, copyIsArray, clone,
			target = arguments[ 0 ] || {},
			i = 1,
			length = arguments.length,
			deep = false;

		// Handle a deep copy situation
		if ( typeof target === "boolean" ) {
			deep = target;

			// Skip the boolean and the target
			target = arguments[ i ] || {};
			i++;
		}

		// Handle case when target is a string or something (possible in deep copy)
		if ( typeof target !== "object" && !isFunction( target ) ) {
			target = {};
		}

		// Extend jQuery itself if only one argument is passed
		if ( i === length ) {
			target = this;
			i--;
		}

		for ( ; i < length; i++ ) {

			// Only deal with non-null/undefined values
			if ( ( options = arguments[ i ] ) != null ) {

				// Extend the base object
				for ( name in options ) {
					src = target[ name ];
					copy = options[ name ];

					// Prevent never-ending loop
					if ( target === copy ) {
						continue;
					}

					if ( deep && copy && jQuery.isPlainObject( copy ) && !Array.isArray( copy )) {

						clone = src && jQuery.isPlainObject( src ) ? src : {};

						// Never move original objects, clone them
						target[ name ] = $.extendObject( deep, clone, copy );

					// Don't bring in undefined values
					} else if ( copy !== undefined ) {
						target[ name ] = copy;
					}
				}
			}
		}

		// Return the modified object
		return target;
	};

})(window.jQuery)