// liukai for design detail page
//2016.1.16 start
;(function(){
    var defaults = {
        speed: 400,
        easing: null,
        preBtn: null,
        nextBtn: null,
        startSlide: 0,
        infiniteLoop: 0,

        //auto
        auto: false,
        pause: 4000,
        autoHover: false,

        //control section
        controlSelector: null,

        // TOUCH
        touchEnabled: true,
        swipeThreshold: 50,
        preventDefaultSwipeX: true,
        preventDefaultSwipeY: false,
    };

    $.fn.carouselSlider = function(options) {
        if (this.length == 0) {
            return this;
        }

        if (this.length > 1) {
            this.each(function() {
                $(this).carouselSlider(options);
            });
        }

        var el = this,
            slider = {};

        if ($(this).data('carouselSlider')) {
            return;
        }

        /**
            ----- private method ----
        **/
        var init = function() {
            slider.settings = $.extend({}, defaults, options);
            slider.children = el.children();
            slider.viewport = el.parent();
            slider.working = false;
            slider.interval = null;

            slider.active = {
                index: slider.settings.startSlide,
            };
            slider.oldIndex = slider.active.index;

            setup();
        };

        var setup = function() {
            if (slider.length === 1) {
                el.destroySlider();
                return this;
            }

            if (slider.settings.infiniteLoop) {
                var sliceAppend = slider.children.slice(0, 1).clone(true).addClass('bx-clone'),
                    slicePrepend = slider.children.slice(-1).clone(true).addClass('bx-clone');
            }
            el.append(sliceAppend).prepend(slicePrepend);

            if (slider.settings.auto) {
                initAuto();
            }

            slider.viewport.css({
                'position': 'relative',
                'overflow': 'hidden',
            });

            el.css({
                'position': 'relative',
                'width': slider.viewport.width() * el.children().length + 'px'
            });

            el.children().css({
                'float': 'left',
                'width': slider.viewport.width(),
                'height': slider.viewport.height(),
            });

            if (slider.settings.controlSelector) {
                slider.settings.controlSelector.children().bind('click touchend', function() {
                    var index = slider.settings.controlSelector.children().index($(this));
                    el.goToSlide(index);
                });
            }

            bindDirection();
            setPositionProperty(slider.active.index, 'reset');
        };

        var setSlideIndex = function(slideIndex) {
            if (slideIndex < 0) {
                if (slider.settings.infiniteLoop) {
                  return slider.children.length - 1;
                }else {
                  return slider.active.index;
                }
              // if slideIndex is greater than children length, set active index to 0 (this happens during infinite loop)
            } else if (slideIndex >= slider.children.length) {
                if (slider.settings.infiniteLoop) {
                  return 0;
                } else {
                  return slider.active.index;
                }
            } else {
                return slideIndex;
            }
        };

        var updateAfterSlideTransition = function() {
            if (slider.settings.infiniteLoop) {
                if (slider.active.index === 0 || slider.active.index === slider.children.length - 1) {
                    setPositionProperty(slider.active.index, 'reset')
                }
            }
            slider.working = false;
        };

        var bindDirection = function() {
            if (slider.settings.preBtn) {
                slider.settings.preBtn.bind('click', function() {
                    el.goToPreSlide();
                });
            }

            if (slider.settings.nextBtn) {
                slider.settings.nextBtn.bind('click', function() {
                    el.goToNextSlide();
                });
            }
        };

        var initAuto = function() {
            el.startAuto();
            $(window).focus(function() {
                el.startAuto();
            }).blur(function() {
                el.stopAuto();
            });

            if (slider.settings.autoHover) {
                slider.viewport.hover(function() {
                  if (slider.interval) {
                    el.stopAuto(true);
                    slider.autoPaused = true;
                  }
                }, function() {
                  if (slider.autoPaused) {
                    el.startAuto(true);
                    slider.autoPaused = false;
                  }
                });
            }
        };

        //touch
        var initTouch = function() {
            slider.touch = {
                start: {x: 0, y: 0},
                end: {x: 0, y: 0}
            };
            slider.viewport.bind('touchstart MSPointerDown pointerdown', onTouchStart);
        };

        var onTouchStart = function(e) {
            slider.touch.originalPos = el.position();
            var orig = e.originalEvent,
            touchPoints = (typeof orig.changedTouches !== 'undefined') ? orig.changedTouches : [orig];
            slider.touch.start.x = touchPoints[0].pageX;
            slider.touch.start.y = touchPoints[0].pageY;
            slider.viewport.bind('touchmove', onTouchMove);
            slider.viewport.bind('touchend', onTouchEnd);
        };

        var onTouchMove = function(e) {
            var orig = e.originalEvent,
            touchPoints = (typeof orig.changedTouches !== 'undefined') ? orig.changedTouches : [orig],
            // if scrolling on y axis, do not prevent default
            xMovement = Math.abs(touchPoints[0].pageX - slider.touch.start.x),
            yMovement = Math.abs(touchPoints[0].pageY - slider.touch.start.y),
            value = 0,
            change = 0;

            // x axis swipe
            if ((xMovement * 3) > yMovement && slider.settings.preventDefaultSwipeX) {
                e.preventDefault();
            // y axis swipe
            } else if ((yMovement * 3) > xMovement && slider.settings.preventDefaultSwipeY) {
                e.preventDefault();
            }
            change = touchPoints[0].pageX - slider.touch.start.x;
            value = slider.touch.originalPos.left + change;
            el.css('left', value);
        };

        var onTouchEnd = function(e) {
            slider.viewport.unbind('touchmove', onTouchMove);
            var orig    = e.originalEvent,
            touchPoints = (typeof orig.changedTouches !== 'undefined') ? orig.changedTouches : [orig],
            value       = 0,
            distance    = 0;
            // record end x, y positions
            slider.touch.end.x = touchPoints[0].pageX;
            slider.touch.end.y = touchPoints[0].pageY;

            distance = slider.touch.end.x - slider.touch.start.x;
            value = slider.touch.originalPos.left;
            if (Math.abs(distance) >= slider.settings.swipeThreshold) {
                if (distance < 0) {
                  el.goToNextSlide();
                } else {
                  el.goToPreSlide();
                }
            } else {
                el.css('left', value);
            }
            slider.viewport.unbind('touchend', onTouchEnd);
        };

        var judgeDirectionStatus = function() {
            if (slider.settings.preBtn && !slider.settings.infiniteLoop) {
                if (slider.active.index === 0) {
                    slider.settings.preBtn.prop('disabled', true).addClass('disabled');
                } else {
                    slider.settings.preBtn.prop('disabled', false).removeClass('disabled');
                }
            }

            if (slider.settings.nextBtn && !slider.settings.infiniteLoop) {
                if (slider.active.index === slider.children.length - 1) {
                    slider.settings.nextBtn.prop('disabled', true).addClass('disabled');
                } else {
                    slider.settings.nextBtn.prop('disabled', false).removeClass('disabled');
                }
            }
        };

        var setPositionProperty = function(slideIndex, type) {
            var left = -slideIndex * slider.viewport.width();
            if (slider.settings.infiniteLoop) {
                left -= slider.viewport.width();
            }

            if (type === 'slide') {
                el.animate({
                    'left': left +'px'
                }, slider.settings.speed, updateAfterSlideTransition);
            } else if (type === 'reset') {
                el.css({
                    'left': left +'px'
                });
            }

            if (slider.settings.controlSelector) {
                var dot = slider.settings.controlSelector.children();
                dot.each(function() {
                    $(this).removeClass('active');
                });
                dot.eq(slider.active.index).addClass('active');
            }
        };


        /**
            ----- public method ----
        **/
        el.goToSlide = function(slideIndex) {
            if (slider.working) {
                return;
            }
            judgeDirectionStatus();
            slider.oldIndex = slider.active.index;
            slider.active.index = setSlideIndex(slideIndex);

            if (slider.active.index === slider.oldIndex) { return; }

            slider.working = true;

            setPositionProperty(slideIndex, 'slide');
        };

        el.stopAuto = function() {
            if (!slider.interval) {return;}

            clearInterval(slider.interval);
            slider.interval = null;
        };

        el.startAuto = function() {
            if (slider.interval) { return; }
            slider.interval = setInterval(function() {
                el.goToNextSlide();
            }, slider.settings.pause);
        };

        el.goToPreSlide = function() {
            el.goToSlide(slider.active.index - 1);
        };

        el.goToNextSlide = function() {
            el.goToSlide(slider.active.index + 1);
        };

        el.destroySlider = function() {
            clearInterval(slider.interval);
            slider.interval = null;
            $(this).removeData('carouselSlider');
        };

        el.reloadSlider = function() {
            if (settings !== undefined) {
                options = settings;
            }

            el.destroySlider();

            init();

            $(el).data('carouselSlider', this);
        };

        init();

        return this;
    };

})($);