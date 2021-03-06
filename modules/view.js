/*
   Licensed under the Apache License v2.0.
            
   A copy of which can be found at the root of this distrubution in 
   the file LICENSE-2.0 or at http://www.apache.org/licenses/LICENSE-2.0
*/

(function (window) {

  var jetzt = window.jetzt
    , config = jetzt.config
    , H = jetzt.helpers
    , div = H.div
    , span = H.span
    , view = {};

  jetzt.view = view;

  // calculate the focal character index
  function calculatePivot (word) {
    var l = word.length;
    if (l < 2) {
      return 0;
    } else if (l < 6) {
      return 1;
    } else if (l < 10) {
      return 2;
    } else if (l < 14) {
      return 3;
    } else {
      return 4;
    }
  }


  function Reader () {
    // elements
    var backdrop = div("sr-blackout")
      , wpm = div("sr-wpm")
      , leftWrap = div("sr-wrap sr-left")
      , rightWrap = div("sr-wrap sr-right")
      , leftWord = span()
      , rightWord = span()
      , pivotChar = span("sr-pivot")
      , word = div("sr-word", [leftWord, pivotChar, rightWord])
      , progressBar = div("sr-progress")
      , message = div("sr-message")
      , reticle = div("sr-reticle")
      , hiddenInput = H.elem("input", "sr-input")

      , box = div("sr-reader", [
          leftWrap,
          div("sr-word-box", [
            reticle, progressBar, message, word, wpm, hiddenInput
          ]),
          rightWrap
        ])

      , wrapper = div("sr-reader-wrapper", [box])

      , unlisten;

    hiddenInput.onkeyup = hiddenInput.onkeypress = function (ev) {
      if(!ev.ctrlKey && !ev.metaKey) {
        ev.stopImmediatePropagation();
        return false;
      }
    };

    var grabFocus = function () {
      hiddenInput.focus();
    };

    this.onBackdropClick = function (cb) {
      backdrop.onclick = cb;
    };

    this.onKeyDown = function (cb) {
      hiddenInput.onkeydown = cb;
    };

    this.applyConfig = function () {
      console.log("yesss");
      // initialise custom size/wpm
      this.setScale(config("scale"));
      this.setWPM(config("target_wpm"));
      this.setFont(config(["view","font_family"]));

      if (config("show_message")) {
        this.showMessage();
      } else {
        this.hideMessage();
      }

      // initialise custom theme
      this.setTheme(config("dark"));
    };

    this.show = function (cb) {
      // fade in backdrop
      document.body.appendChild(backdrop);
      backdrop.offsetWidth;
      H.addClass(backdrop, "in");

      // pull down box;
      document.body.appendChild(wrapper);
      wrapper.offsetWidth;
      H.addClass(wrapper, "in");

      // apply and listen to config;
      this.applyConfig();
      var that = this;
      unlisten = config.onChange(function () { that.applyConfig(); });

      // need to stop the input focus from scrolling the page up.
      var scrollTop = H.getScrollTop();
      grabFocus();
      document.body.scrollTop = scrollTop;
      document.documentElement.scrollTop = scrollTop;

      hiddenInput.onblur = grabFocus;

      typeof cb === 'function' && window.setTimeout(cb, 340);
    };


    this.hide = function (cb) {
      unlisten();
      hiddenInput.onblur = null;
      hiddenInput.blur();
      H.removeClass(backdrop, "in");
      H.removeClass(wrapper, "in");
      window.setTimeout(function () {
        backdrop.remove();
        wrapper.remove();
        typeof cb === 'function' && cb();
      }, 340);
    };

    this.setScale = function (scale) {
      wrapper.style.webkitTransform = "translate(-50%, -50%) scale("+scale+")";
      wrapper.style.mozTransform = "translate(-50%, -50%) scale("+scale+")";
      wrapper.style.transform = "translate(-50%, -50%) scale("+scale+")";
    };

    this.setWPM = function (target_wpm) {
      wpm.innerHTML = target_wpm + "";
    };
    
    this.setFont = function (font) {
      // really, we should be setting font-family of 
      //  ".sr-reader .sr-word-box .sr-word > span"
      word.style.fontFamily = font;
    };

    this.setTheme = function (dark) {
      if (dark)
        H.addClass(box, "sr-dark");
      else
        H.removeClass(box, "sr-dark");
    };

    this.setProgress = function (percent) {
      progressBar.style.borderLeftWidth = Math.ceil(percent * 4) + "px";
    };

    this.setMessage = function (msg) {
     message.innerHTML = msg;
    };

    this.showMessage = function () {
      message.style.display = "block";
    };

    this.hideMessage = function () {
      message.style.display = "none";
    };

    this.started = false;

    this.setWord = function (token) {
      var pivot = calculatePivot(token.replace(/[?.,!:;*-]+$/, ""));
      leftWord.innerHTML = token.substr(0, pivot);
      pivotChar.innerHTML = token.substr(pivot, 1);
      rightWord.innerHTML = token.substr(pivot + 1)

      word.offsetWidth;
      var pivotCenter = reticle.offsetLeft + (reticle.offsetWidth / 2);
      word.style.left = (pivotCenter - pivotChar.offsetLeft - (pivotChar.offsetWidth / 2)) + "px";
    };

    this.setWrap = function (left, right) {
      leftWrap.innerHTML = left;
      rightWrap.innerHTML = right;

      var lw = leftWrap.offsetWidth;
      var rw = rightWrap.offsetWidth;

      wrapper.style.paddingLeft = "50px";
      wrapper.style.paddingRight = "50px";
      if (lw > rw) {
        wrapper.style.paddingRight = 50 + (lw - rw) + "px";
      } else if (rw > lw) {
        wrapper.style.paddingLeft = 50 + (rw - lw) + "px";
      }
    };

    this.clear = function () {
      this.setWrap("", "");
      this.setWord("   ");
    };
  }



  // we only need one instance of Reader now.
  var readerSingleton;

  view.__defineGetter__("reader", function () {
    if (!readerSingleton) readerSingleton = new Reader();

    return readerSingleton;
  });


  var overlaidElems = [];

  /**
   * Makes an overlay for the given element.
   * Returns false if the overlay is off the bottom of the screen,
   * otherwise returns true;
   */
  view.addOverlay = function (elem) {
    var rect = elem.getBoundingClientRect();

    var overlay = H.div("sr-overlay");
    overlay.style.top = (H.getScrollTop() + rect.top) + "px";
    overlay.style.left = (H.getScrollLeft() + rect.left) + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";
    overlay.style.backgroundColor = config(["view", "selection_color"]);
    document.body.appendChild(overlay);
    elem.___jetztOverlay = overlay;

    overlaidElems.push(elem);

    return rect.top < window.innerHeight;
  };

  view.removeOverlay = function (elem) {
    if (elem.___jetztOverlay) {
      elem.___jetztOverlay.remove();
      delete elem.___jetztOverlay;
      H.removeFromArray(overlaidElems, elem);
    }
  };

  view.removeAllOverlays = function () {
    for (var i = overlaidElems.length; i--;) {
      var elem = overlaidElems[i];
      elem.___jetztOverlay.remove();
      delete elem.___jetztOverlay;
    }
    overlaidElems = [];
  };



  var highlight;

  view.highlightRange = function (range) {
    // todo
  };


})(this);
