// Foundation JavaScript
// Documentation can be found at: http://foundation.zurb.com/docs
$(document).foundation();

// Counter
// $('.counter').counterUp({
//   delay: 10,
//   time: 1000
// });

// jQuery Internal Animation Scrolling
$(function() {
  $('a[href*=#]:not([href=#])').click(function() {
    if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
      if (target.length) {
        $('html,body').animate({
          scrollTop: target.offset().top
        }, 1000);
        return false;
      }
    }
  });
});

$(document).on(
          'click',
          '.menu-btn',
          function() {
              $('.responsive-menu').toggleClass('expand');
          }
);

$(function() {
  var $button = $('<button class="back-to-top" type="button" aria-label="Zpět nahoru" title="Zpět nahoru"><span class="fa fa-angle-up" aria-hidden="true"></span></button>');
  $('body').append($button);

  function updateBackToTop() {
    $button.toggleClass('visible', $(window).scrollTop() > 500);
  }

  $button.on('click', function() {
    $('html,body').animate({
      scrollTop: 0
    }, 600);
  });

  $(window).on('scroll', updateBackToTop);
  updateBackToTop();
});
