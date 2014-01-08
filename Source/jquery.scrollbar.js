
/****************************************************************************
    jQuery pluggin scrollbar, adds scroll bar for a container element.

**  @author Shmuel Friedman. shmuel.friedman3@gmail.com
**  @date: 10/10/12

**  some inspiration gotten from Andrew Lowndes http://www.aplweb.co.uk/blog/js/scrollbars-v2/ pluggin

**  usage: $(domElement).scrollbar(axis, options);
**  adds scroll bar to domElement that is a container of elements
**  @requires jquery.event.drag.js
**  @optional jquery.mousewheel.js

**  $(domElement).scrollbar have this parameters:
**      0. domElement - a container element that have content bigger than his size
**      1. axis - 'x' for horizontal scroller, or 'y' for vertical ['y' is default]
**      2. parameter 2 [optional] can be options object that include the following properties
**              scrollerWraper - dom element or element selector to hold ths scroller.
**         or a string contains method name, methods are: 
**              update - updates scroller size and position according to the scroll position of the domElement

**  examples:
**  example 1: $(domElement).scrollbar('x', {scrollerWraper: '#elementid'});
**  example 2: $(domElement).resize(function() { $(this).scrollbar('y') }); // in this example the scroller width will update according to the new container size.

**************************************************************************** */

(function ($) {
    $.fn.scrollbar = function (axis, options, optionValue) {
        var defOptions;

        if (typeof options == 'undefined')
            options = {};

        var stepSize = 10;
        if (typeof options == 'object') {
            if (options.multiContainerScroller) {
                setupScrollBar.call(this);
                return $(this);
            }
            else {
                return $(this).each(setupScrollBar);
            }
        } else {
            if (options == 'update') {
                var updateParam;
                if (typeof optionValue != null)
                    updateParam = { scrollSize: optionValue };

                return $(this).each(function () {
                    var scrollBar = $(this).data('scrollbar' + axis);
                    scrollBar.updateScroller(true, updateParam);
                });
            }
            else if (options == 'addToScrollSize') {
                
                return $(this).each(function () {
                    var scrollBar = $(this).data('scrollbar' + axis);
                    scrollBar.updateScroller(true, { addToScrollSize: optionValue });
                });
            }
            else if (options == 'refreshItemsSelector') {
                return $(this).each(function () {
                    var scrollBar = $(this).data('scrollbar' + axis);
                    var updateParam;
                    if (typeof optionValue == 'object') {
                        if (optionValue.rebindEvents)
                            scrollBar.bindEvents();
                        optionValue = optionValue.selector;
                    }
                    scrollBar.refreshItemsSelector(optionValue);
                });
            }
            else if (options == 'destroy') {
                var scrollbar = $(this).data('scrollbar' + axis);
                if (scrollbar) {
                    scrollbar.destroy();
                    $(this).removeData('scrollbar' + axis);
                }
            }
        }

        function setupScrollBar() {
            var $this = $(this);
            var scrollBar = $this.data('scrollbar' + axis);

            if (!scrollBar) {
                scrollBar = new ScrollBar(axis, $this, options);
                $this.data('scrollbar' + axis, scrollBar);
                scrollBar.createScroller();
            }
            else {
                if (options.rebindEvents)
                    scrollBar.bindEvents();
                scrollBar.updateScroller();
            }
        }

        function ScrollBar(pAxis, container, options) {
            var that = this;
            var axis = pAxis;
            var scrollerWraper;
            var dir = axis == 'x' ? 'left' : 'top';
            var opositeDir = axis == 'x' ? 'right' : 'bottom';
            var dir2 = axis == 'x' ? 'top' : 'left';
            var opositeDir2 = axis == 'x' ? 'bottom' : 'right';

            var size = axis == 'x' ? 'width' : 'height';
            var outerSize = $.camelCase('outer-' + size);
            var size2 = axis == 'x' ? 'height' : 'width';
            var coord = axis ? axis.toUpperCase() : 'Y';
            var scrollPos = $.camelCase('scroll-' + dir);
            var scrollSize = $.camelCase('scroll-' + size);
            var $container;
            if (container instanceof jQuery) {
                $container = container;
                container = $container[0];
            }
            else {
                $container = $(container);
            }

            var $scrollerWraper;
            var $slider;
            var maxPos;
            var newPos;
            var hasWraperPositioned;
            var isWraperOur;

            // public members :
            this.createScroller = createScroller;
            this.updateScroller = updateScroller;
            this.bindEvents = bindEvents;
            this.unbindEvents = unbindEvents;
            this.destroy = destroy;
            this.scroller = null;
            this.refreshItemsSelector = refreshItemsSelector;
            this.getItems = function () { return items; };

            fillFromClasses(options, $container, ['multiContainerScroller', 'manualPosition', 'resizeable']);

            // private members:
            function createScroller() {

                scrollerWraper = options.scrollerWraper;

                //var sliderClass = (axis == 'x' ? 'ui-slider-horizontal' : 'ui-slider-vertical');
                var scrollerClass = (axis == 'x' ? 'ui-scroller-horizontal' : 'ui-scroller-vertical');
                if (!scrollerWraper) {
                    var parent = $container.parent();
                    $scrollerWraper = parent.find(scrollerClass);
                    if (!$scrollerWraper.length)
                        $scrollerWraper = $('<div>').appendTo(parent)
                    scrollerWraper = $scrollerWraper[0];
                    hasWraperPositioned = false;
                } else {
                    $scrollerWraper = $(scrollerWraper);

                    if (!options.manualPosition) {
                        $scrollerWraper = $('<div>').appendTo($scrollerWraper);
                        hasWraperPositioned = false;
                    }
                    else
                        hasWraperPositioned = true;
                }
                this.scroller = $scrollerWraper;
                isWraperOur = !hasWraperPositioned;

                if (!$scrollerWraper.hasClass('ui-slider')) {// slider has not initialized on that wraper
                    $scrollerWraper.addClass('ui-slider ' + scrollerClass + ' ui-widget ui-widget-content')
                        .append('<a class="ui-slider-handle ui-state-default ui-state-hover" href="#" style="' + (axis == 'x' ? 'left: 0%; margin-left:0px;' : 'top: 0%;') + '" />');
                    $scrollerWraper.data('scrollbar', that);
                } else {
                    $scrollerWraper.data('scrollbar').unbindEvents();
                    $scrollerWraper.data('scrollbar', that);
                }
                $scrollerWraper.css('z-index', $container.css('z-index'));
                $container.css("overflow", "hidden");
                $slider = $scrollerWraper.find('a.ui-slider-handle');

                bindEvents();
                if (options.virtualScroll) {
                    options.fixedScrollSize = true;
                    if (options.ItemsSelector)
                        refreshItemsSelector(options.ItemsSelector);
                }
                
                updateScroller();
            };

            that.isVirtual = isVirtual;
            function isVirtual() {
                return options.virtualScroll;
            }

            function scrollScroller(pos, isStep) {
                maxPos = $scrollerWraper[size]() - $slider[size]();
                if (isStep)
                    newPos = Math.max(0, Math.min(maxPos, parseFloat(getScrollerPosition()) + parseFloat(pos * maxPos)));
                else
                    newPos = Math.max(0, Math.min(maxPos, pos));

                var posCss = {}; posCss[dir] = newPos;
                $slider.css(posCss);
            }

            function scrollContainerAndScroller(pos, isStep) {
                scrollScroller(pos, isStep);
                //scrollContainers((newPos / maxPos) * (container[scrollSize] - $container[size]()));
                if (!options.virtualScroll)
                    $container.each(setContainerPos);
                else
                    $container.each(setContainerPosVirtual);
                return 0 < newPos && newPos < maxPos;
            }

            function setContainerPos() {
                var newScrollPos = containerScroll.fromScrollerPos($(this));
                this[scrollPos] = newScrollPos;
                //$this.trigger('scrolled.scrollbar', [{ scrollerPos: newPos, scrollerSize: maxPos, containerPos: newScrollPos, containerSize: $this[size](), continerScrollSize: currScrollArea, dir: axis }]);
            }
            
            // --------------------- local Events: ----------------------- //
            function scrollerDragStart(e, dd) {
                if (!$container.is(':visible'))
                    return;
                //$container.trigger('scrolling.scrollbar')
                dd.origPos = $(this).position()[dir];
            }
            function scrollerDrag(e, dd) {
                if (!$container.is(':visible'))
                    return;
                scrollContainerAndScroller(dd.origPos + dd['delta' + coord]);
            }
            function scrollerDraggableDrag(e, dd) {
                if (!$container.is(':visible'))
                    return;
                scrollContainerAndScroller(dd.originalPosition[dir] + dd.offset[dir]); 
            }
            function scrollerDragEnd() {
                //$container.trigger('scrollend.scrollbar');
            }

            function scrollAreaMouseDown(e) {
                if (!$container.is(':visible'))
                    return;
                $container.trigger('scrolling.scrollbar')
                scrollContainerAndScroller(e['page' + coord] - $scrollerWraper.offset()[dir] - ($slider[size]() / 2.0));
                $container.trigger('scrollend.scrollbar');
            }

            // positioning and sizing
            function calcOuterSize(elem, size, dirSize) {
                return size + (elem[$.camelCase('outer-' + dirSize)]() - elem[dirSize]());
            }

            function calcInnerSize(elem, size, dirSize) {
                return size - (elem[$.camelCase('outer-' + dirSize)]() - elem[dirSize]());
            }

            function selectContainer() {
                if (options.multiContainerScroller) {
                    $container.each(function () {
                        if (getScrollArea($(this)) > getScrollArea($(container)))
                            container = this;
                    });
                }
            }

            function updateScroller(updateScrollSize, scrollAreaParams) {
                var out = {};
                var shouldUpdate = preScrollerUpdate(updateScrollSize, scrollAreaParams, out);
                if (shouldUpdate) {
                    setScrollerWraperPosition();
                    setScrollerSize(out.currScrollArea, out.containerSpace);
                    scrollScrollerByContainer();
                }
            }

            function preScrollerUpdate(updateScrollSize, scrollAreaParams, out) {
                selectContainer();

                out.currScrollArea = getSetScrollArea(updateScrollSize, scrollAreaParams);
                out.containerSpace = out.currScrollArea - $container[size]();

                return hideShowScroller(out.containerSpace);
            }

            function hideShowScroller(containerSpace) {
                if (containerSpace > 0) {
                    if (!$scrollerWraper.is(':visible')) {
                        $scrollerWraper.show();
                        if (axis == 'y')
                            onEventEnd($container, 'mousewheel', containerMouseWhealEnd, containerMouseWheal);
                    }
                    return true;
                }
                else {
                    $scrollerWraper.hide();
                    if (axis == 'y')
                        $container.unbind('mousewheel', containerMouseWheal);
                }
            }
            var scrollRatio = {
                fromWheelStep: function (delta) {
                    return -(delta * 30) / getScrollArea($(container));
                },
                fromContainerPos: function () {
                    return container[scrollPos] / (getScrollArea($(container)) - $container[size]())
                },
                fromVirtualScroll: function () {
                    return (numOfItemsBefore * itemSize + container[scrollPos]) / (getScrollArea($(container)) - $container[size]());
                }
            };
            var containerScroll = {
                fromScrollerPos: function ($cont) {
                    return (newPos / maxPos) * (getScrollArea($cont) - $cont[size]());
                },
                toScrollRatio: scrollRatio.fromContainerPos
            };
            var scrollerPos = {
                toContainerScroll: containerScroll.fromScrollerPos/*,
                toVirtualScroll: virtualScroll.fromScrollerPos*/
            };
            function setScrollerSize(currScrollArea, containerSpace) {
                var scrollerSpace = ($scrollerWraper[size]() / currScrollArea) * containerSpace/* / stepSize*/;

                var newSize = $scrollerWraper[size]() - scrollerSpace;
                if (newSize < 5)
                    newSize = 5;
                $slider[size](newSize);
            }
            
            function scrollScrollerByContainer() {
                var pos = currentScrollRatio();
                scrollScroller(pos, false);
                //$container[scrollPos] * maxPos / (container[scrollSize] - $container[size]());
                return { scrollerPos: newPos * maxPos, scrollerSize: maxPos };
            }
            
            function containerMouseWheal(e, delta) { // TODO: correlate this with scrollContainerAndScroller
                $container.trigger('scrolling.scrollbar')
                /*//$container.scrollTop($container.scrollTop() - (delta * 30));
                //scrollContainers($container.scrollTop() - (delta * 30));
                $container.each(function () { this.scrollTop = this.scrollTop - (delta * 30); });

                if (options.virtualScroll)
                    setNumberOfItemsBefore(numOfItemsBefore - (delta > 0 ? 1 : -1));

                var e = scrollScrollerByContainer();

                $container.each(function () {
                    var $this = $(this);
                    $this.trigger('scrolled.scrollbar', [$.extend(e, { containerPos: this.scrollTop, containerSize: $this[size](), continerScrollSize: getScrollArea($this) })]);
                });*/
                selectContainer();
                Step(scrollRatio.fromWheelStep(delta));
                return true;
            }

            var Step = this.Step = function (step, moveTo) {
                var pos = step;
                if (moveTo) {
                    var cont = {};
                    if (!preScrollerUpdate(null, null, cont))
                        return;
                    pos = (pos / cont.containerSpace) * ($scrollerWraper[size]() - $slider[size]())
                }
                return scrollContainerAndScroller(pos, !moveTo);
            }
            this.scrollTop = function (val) {
                return val
                     ? Step(val, true)
                     : currentScrollPos();
            };

            function containerMouseWhealEnd() {
                $container.trigger('scrollend.scrollbar');
            }
            function setScrollerWraperPosition() {
                if (hasWraperPositioned)
                    return;
                hasWraperPositioned = true;

                var relocateWraper = { position: 'absolute' };
                var containerPos = $container.position();
                relocateWraper[dir] = containerPos[dir];
                relocateWraper[size2] = 12;

                var scrollerOuterSize = calcOuterSize($scrollerWraper, 12, size2);
                var newConainerSize = $container[size2]() - scrollerOuterSize;
                var newWraperSize = calcInnerSize($scrollerWraper, $container[size](), size);

                if (!options.resizeable) {
                    $container[size2](newConainerSize);

                    relocateWraper[dir2] = containerPos[dir2] + $container[size2]();
                    relocateWraper[size] = newWraperSize;
                }
                else {
                    var resizeContainer = {};
                    resizeContainer[opositeDir2] = $container.parent()[size2]() - newConainerSize - containerPos[dir2];
                    $container.css(resizeContainer);

                    relocateWraper[opositeDir2] = resizeContainer[opositeDir2] - scrollerOuterSize;
                    relocateWraper[opositeDir] = $container.parent()[size]() - (relocateWraper[dir] + newWraperSize);
                }

                $scrollerWraper.css(relocateWraper);
            }

            function getSetScrollArea(updateScrollArea, scrollAreaParams) {
                var currScrollArea;
                if (updateScrollArea === true) {
                    if (scrollAreaParams.addToScrollSize)
                        currScrollArea = getScrollArea($(container), true, scrollAreaParams.addToScrollSize);
                    else {
                        $(container).data(scrollSize, scrollAreaParams.scrollSize);
                        currScrollArea = getScrollArea($(container));
                    }
                }
                else
                    currScrollArea = getScrollArea($(container));
                return currScrollArea;
            }

            var getScrollArea = this.getScrollArea = function ($elem, forceUpdateSize, scrollAreaAddition) {
                if (!$elem) $elem = $container;
                if (options.fixedScrollSize) {
                    var savedScrollSize;
                    if (!$elem.data(scrollSize) || forceUpdateSize) {
                        if (scrollAreaAddition)
                            savedScrollSize = $elem.data(scrollSize) + scrollAreaAddition;
                        else
                            savedScrollSize = $elem[0][scrollSize];
                        $elem.data(scrollSize, savedScrollSize);
                    }
                    else
                        savedScrollSize = $elem.data(scrollSize);
                    return savedScrollSize;
                }
                else
                    return $elem[0][scrollSize];
            }
            function fillFromClasses(obj, elem$, keys) {
                for (var i = 0; i < keys.length; i++) {
                    if (elem$.hasClass(keys[i]))
                        obj[keys[i]] = true;
                }
            }
            
            //----------------//
            // VIRTUAL SCROLL //
            //----------------//
            var virtualScrollInitialized,
                items,
                itemsFilter,
                itemSize,
                numOfItemsBefore = 0,
                itemsToDisplay,
                //scrollSpace = 20,
                prevState;

            that.currentScrollPos = currentScrollPos;
            function currentScrollPos() {
                return currentScrollRatio() * getScrollArea();
            }
            // returns item index out of point (actual x or y coordinate (accordin to dir of the scrollbar) on the container)
            that.findItem = findItem;
            function findItem(point) {
                return numOfItemsBefore + parseInt((container[scrollPos] + point) / itemSize);
            }
            that.virtualPos = virtualPos;
            function virtualPos(point) {
                return numOfItemsBefore * itemSize + point; //parseInt((container[scrollPos] + point) / itemSize);
            }
            function currentScrollRatio() {
                //var pos = $container[scrollPos]() / (container[scrollSize] - $container[size]());
                var pos;
                if (options.virtualScroll)
                    pos = scrollRatio.fromVirtualScroll(); //numOfItemsBefore / items.length;
                else if (options.fixedScrollSize)
                    pos = parseInt($slider.css(dir).replace('px', '')) / ($scrollerWraper[size]() - $slider[size]());
                else
                    pos = scrollRatio.fromContainerPos();
                if (isNaN(pos)) pos = 0;
                return pos;
            }
            function getScrollerPosition() {
                var ret = $slider.css(dir).replace('px', '');
                if (ret.indexOf('%') > 0)
                    ret = $scrollerWraper[size]() * ret.replace('%', '') / 100;
                return ret;
            }
            function getScrollerPositions() {
                var e = {};
                e.scrollerSize = $scrollerWraper[size]() - $slider[size]();
                e.scrollerPos = getScrollerPosition();
                e.newNumOfItemsBefore = numOfItemsBefore;
                e.end = numOfItemsBefore + itemsToDisplay - 1;
                return e;
            }

            function initVirtualScroll() {
                if (virtualScrollInitialized)
                    return;
                virtualScrollInitialized = true;
                //$('#tableComment .commentData:last').after('<div id=\'shmuel\'></div>');
                var firstTr = $container.find(itemsFilter + ':first');
                firstTr.removeClass('scrolledOutOfView');
                itemSize = firstTr[size](); //27
                firstTr.addClass('scrolledOutOfView');
                numOfItemsBefore = 0;
                setItemsToDisplay(itemSize);
                //$container.bind('scrolled.scrollbar', hideShowElements);
                prepareShowHideActions();
            }

            function prepareShowHideActions() {
                if (!options.scrolledItemInitializers) {
                    hideItems = function (selector) {
                        return items.filter(selector).addClass('scrolledOutOfView');
                    }
                    showItems = function (selector) {
                        return items.filter(selector).removeClass('scrolledOutOfView');
                    }
                }
                else {
                    hideItems = function (selector) {
                        return items.filter(selector).addClass('scrolledOutOfView').each(options.scrolledItemInitializers.dispose);
                    }
                    showItems = function (selector) {
                        return items.filter(selector).removeClass('scrolledOutOfView').each(options.scrolledItemInitializers.init);
                    }
                }
            }

            function setItemsToDisplay(/*_itemSize*/) {
                //scrollSpace = _itemSize;
                /*itemsToDisplay = parseInt($container[size]() / itemSize);
                if ((itemsToDisplay * itemSize - $container[size]()) < itemSize * 2)
                    itemsToDisplay = itemsToDisplay + 2;*/

                //var tmp = (2 * itemSize + $container[size]()) / itemSize;
                var tmp = (2 * $container[size]()) / itemSize;
                itemsToDisplay = (tmp - parseInt(tmp)) > 0 ? parseInt(tmp) + 1 : tmp;

                /*var L = (items ? items : $container.find(itemsFilter)).length;
                if (itemsToDisplay > L) itemsToDisplay = L;*/
            }

            function refreshItemsSelector(selector) {
                if (selector) 
                    itemsFilter = selector;
                initVirtualScroll();
                if (selector)
                    fixDynamicScroller(true);
                else
                    fixDynamicScroller(); //applyItemsFilter();
            }

            function fixDynamicScroller(isNewSelector) {
                //$('.t-grid-content .scrolledOutOfView').removeClass('scrolledOutOfView');
                //$('.t-grid-content').scrollbar('y', 'update');
                //items = $('.t-grid-content tr:visible');
                var oldLength;
                if (!isNewSelector)
                    oldLength = items ? items.length : 0;
                applyItemsFilter(isNewSelector);
                if (isNewSelector)
                    updateScroller(true, { scrollSize: items.length * itemSize });
                else {
                    number = items.length - oldLength;
                    var itemsSize = number * itemSize;

                    updateScroller(true, { addToScrollSize: itemsSize });
                }
            }

            function applyItemsFilter(isNewSelector) {
                
                var inactiveTrs;
                if (items && isNewSelector)
                    inactiveTrs = items.filter(':not(.scrolledOutOfView):not(' + itemsFilter + ')');
                prevState = null;
                items = $container.find(itemsFilter);
                //if (preScrollerUpdate(updateScrollSize, scrollAreaParams, {})) {
                if (inactiveTrs)
                    inactiveTrs.addClass('scrolledOutOfView');
                var visItems = hideShowElements(null, getScrollerPositions());
                if (visItems.length) {
                    var _itemSize = visItems.last()[size]();
                    itemSize = (visItems.last().offset()[dir] + _itemSize - visItems.first().offset()[dir]) / visItems.length;
                    setItemsToDisplay(); //(itemSize)
                }
            }

            var virtualScroll = {
                toScrollRatio: scrollRatio.fromVirtualScroll,
                posFromRatio: function(ratio, containerSize, virtualScrollArea) {
                    return parseInt(ratio * (virtualScrollArea - containerSize))
                },
                // ret: {containerPosRelative, containerPos, newNumOfItemsBefore}
                fromScrollerPos: function (pos, containerSize, virtualScrollArea) {
                    var s1 = this.posFromRatio(pos / maxPos, containerSize, virtualScrollArea);
                    //var s1 = parseInt((pos / maxPos) * (virtualScrollArea - containerSize));
                    return this.fromVirtualPos(s1, containerSize);
                },
                fromVirtualPos: function (s1, containerSize) {
                    var ret = {};
                    /*if (s1 == 0)
                        ret.containerPos = ret.newNumOfItemsBefore = 0;
                    else {
                        var d1;
                        var ib = s1 / itemSize;
                        d1 = Math.round((ib - parseInt(ib)) * itemSize);
                        ib = parseInt(ib);
                        //var d2 = (s1 + e1.containerSize) / itemSize; d2 = itemSize + parseInt(d2) - d2;

                        if (d1 == 0) {
                            ib -= 1;
                            d1 += itemSize;
                        }
                        if (ib < 0)
                            ib == 0;
                        var diff = (ib + itemsToDisplay) - items.length;
                        if (diff > 0) {
                            ib -= diff;
                            d1 += itemSize * diff;
                        }
                        if (items.length == itemsToDisplay)
                            ib = 0;
                        //if ((d1 - e1.containerSize) >= actualScrollArea) {
                        //    ib += 1;
                        //    d1 -= itemSize;
                        //}
                        ret.containerPosRelative = d1;
                        ret.containerPos = s1;
                        ret.newNumOfItemsBefore = ib;
                    }*/
                    var pos = s1;
                    var h = itemSize;
                    var H = containerSize;
                    /*var start = parseInt(pos / h); start = start != 0 ? start - 1 : start;
                    var end = parseInt((pos + H) / h); end = end < (items.length - 1) ? end + 1 : end;*/
                    var start = parseInt((pos - H * 0.5) / h); start = start < 0 ? 0 : start;
                    var end = parseInt((pos + H + H * 0.5) / h); end = end < (items.length - 1) ? end : items.length - 1;
                    itemsToDisplay = end - start + 1;
                    //return { start: start, end: end };
                    ret.containerPosRelative = (pos - start  * itemSize);
                    ret.containerPos = s1;
                    ret.newNumOfItemsBefore = start;
                    ret.end = end;
                    return ret;
                }
            };
            
            

            function setContainerPosVirtual() {
                var $this = $(this);
                var virtualScrollArea = getScrollArea($this);
                var actualScrollArea = this[scrollSize];
                //var newScrollPos = (newPos / maxPos) * (virtualScrollArea - $this[size]());
                var e1 = { scrollerPos: newPos, scrollerSize: maxPos, containerSize: $this[size](), continerScrollSize: virtualScrollArea, dir: axis };

                var pos = virtualScroll.fromScrollerPos(newPos, e1.containerSize, virtualScrollArea);
                e1.containerPos = pos.containerPos;
                e1.newNumOfItemsBefore = pos.newNumOfItemsBefore;
                e1.end = pos.end;

                hideShowElements(null, e1);
                this[scrollPos] = pos.containerPosRelative;
                //$this.trigger('scrolled.scrollbar', [e1]);
                //$('#shmuel').text('ib:' + ib + ', s1:' + s1 + ', d1:' + d1 + ', sp:' + this[scrollPos] + ', ss:' + actualScrollArea+ ', itd:' + items.filter(':visible').length);
                /*var newScrollPos = (newPos / maxPos) * (virtualScrollArea - e1.containerSize);
                var tmp = parseInt(newScrollPos / itemSize);
                var newNum = null;
                var decrease = null;
                if (tmp != numOfItemsBefore) {
                    if (numOfItemsBefore !== null && tmp < numOfItemsBefore)
                        decrease = true;
                    newNum = tmp;
                    tmp = numOfItemsBefore;
                    numOfItemsBefore = tmp;
                }
                newScrollPos -= numOfItemsBefore * itemSize;
                
                if (numOfItemsBefore && newScrollPos < scrollSpace) {
                    newScrollPos += itemSize;
                    newNum = numOfItemsBefore - 1
                    if (tmp == newNum)
                        newNum = null;
                    decrease = true;
                }
                else if (numOfItemsBefore && (itemsToDisplay * itemSize - newScrollPos - e1.containerSize) < scrollSpace) {
                    newScrollPos -= itemSize;
                    newNum = numOfItemsBefore + 1;
                    if (tmp == newNum)
                        newNum = null;
                }
                e1.containerPos = newScrollPos;
                
                if (!decrease) {
                    if (newNum !== null) {
                        e1.newNumOfItemsBefore = newNum;
                        hideShowElements(null, e1);
                    }
                }
                this[scrollPos] = newScrollPos;
                if (newNum !== null && decrease) {
                    e1.newNumOfItemsBefore = newNum;
                    hideShowElements(null, e1);
                }
                $this.trigger('scrolled.scrollbar', [e1]);
                $('#shmuel').text(newNum + ', ' + parseInt(newScrollPos) + ', ' + this[scrollPos]);*/
                /*if (!numOfItemsHasSet)
                    hideShowElements(null, e1);*/
            }
            
            function hideShowElements(j, e1) {
                var e;
                //if (e1)
                    e = e1;
                /*else
                    e = getScrollerPositions();*/

                    if (prevState && prevState.end == e.end && prevState.newNumOfItemsBefore == e.newNumOfItemsBefore && prevState.selector == itemsFilter && prevState.itemsToDisplay == itemsToDisplay && prevState.scrollerSize == e.scrollerSize)
                    return;
                prevState = { newNumOfItemsBefore: e.newNumOfItemsBefore, selector: itemsFilter, itemsToDisplay: itemsToDisplay, end: e.end, scrollerSize: e.scrollerSize };

                var val = e.newNumOfItemsBefore;
                var ret;

                if (val >= 0)
                    numOfItemsBefore = val;
                else
                    numOfItemsBefore = 0;
                ////console.log('setNumberOfItemsBefore ' + numOfItemsBefore);
                var start = numOfItemsBefore; //parseInt(vis.numOfItemsBefore);
                var end = e.end;
                var itemsToDisplay = e.end - numOfItemsBefore + 1;//vis.itemsToDisplay;
                if (start > 0) {
                    hideItems(':lt(' + start + ')');
                    ret = showItems(':gt(' + (start - 1) + '):lt(' + itemsToDisplay + ')');
                    hideItems(':gt(' + end/*start + itemsToDisplay - 1*/ + ')');
                }
                else {
                    ret = showItems(':lt(' + (end + 1) + ')');
                    hideItems(':gt(' + end + ')');
                }
                return ret;
                //setNumberOfItemsBefore(parseInt((e.scrollerPos / e.scrollerSize) * (items.length - itemsToDisplay)) - 1); //parseInt(((containerPos + 1) / (itemHeight + 1)));
            }

            var hideItems,
                showItems;
            
            //function removeAllOutOfViewClasses() {

            //    $('.t-grid-content .scrolledOutOfView').removeClass('scrolledOutOfView');
            //}

            function bindDrag() {
                if ($slider.drag)
                    $slider.drag("start", scrollerDragStart)
                           .drag(scrollerDrag)
                           .drag('end', scrollerDragEnd);
                else if ($slider.draggable) {
                    $slider.draggable({
                        //start: scrollerDragStart,
                        drag: scrollerDraggableDrag,
                        stop: scrollerDragEnd,
                        containment: $scrollerWraper,
                        axis: axis
                    });
                }
            }

            function unbindDrag() {
                if ($slider.drag) {
                    $slider.unbind('dragstart', scrollerDragStart);
                    $slider.unbind('drag', scrollerDrag);
                }
                else 
                    $slider.draggable('destroy');
            }

            function bindEvents() {
                // for dragging the slider:
                bindDrag()

                // for clicking on the scroll area, jumps the slider to the clicked point:
                $scrollerWraper.mousedown(scrollAreaMouseDown);

                //allow the mouse wheel to scroll the content
                if (axis == 'y')
                    onEventEnd($container, 'mousewheel.scrollbar', containerMouseWhealEnd, containerMouseWheal);

                // update scrollers
                $container.resize(updateScroller);
                $(window).resize(updateScroller);

                $container.scroll(function (e) {
                    var a = e;
                });

                /*if (virtualScrollInitialized)
                    $container.bind('scrolled.scrollbar', hideShowElements);*/
            }

            function unbindEvents() {
                unbindDrag();
                $scrollerWraper.unbind('mousedown', scrollAreaMouseDown)
                if (axis == 'y')
                    $container.unbind('mousewheel.scrollbar');
                $container.unbind('resize', updateScroller);
                /*if (virtualScrollInitialized)
                    $container.unbind('scrolled.scrollbar', hideShowElements);*/
            }

            function destroy() {
                unbindEvents();
                if (isWraperOur)
                    $scrollerWraper.remove();
            }
        }
    };
})(jQuery);

if (typeof onEventEnd == 'undefined')
    onEventEnd = function (elem, eventName, endCallback, middleCallback, timeout) {
        var rtime = new Date(1, 1, 2000, 12, 00, 00);
        var timeout = false;
        if (typeof timeout == 'undefined')
            timeout = 200
        $(elem).bind(eventName, function () {
            if (middleCallback)
                middleCallback.apply(elem, arguments);
            rtime = new Date();
            if (timeout === false) {
                timeout = true;
                setTimeout(eventend, timeout);
            }
        });

        function eventend() {
            if (new Date() - rtime < timeout) {
                setTimeout(eventend, timeout);
            } else {
                timeout = false;
                endCallback();
            }
        }
    };

jQuery.fn.rScrollTop = jQuery.fn.scrollTop;
jQuery.fn.scrollTop = function (value) {
    var $this = $(this);
    var scrollbar = $this.data('scrollbary');
    if (scrollbar && scrollbar.isVirtual()) {
        if (value) {
            scrollbar.Step(value, true);
            return $this;
        }
        else
            return scrollbar.currentScrollPos();
    }
    return value !== undefined ? this.rScrollTop(value) : this.rScrollTop();
};