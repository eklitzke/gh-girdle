// ==UserScript==
// @name           gh-girdle
// @namespace      gh-girdle
// @include        https://github.com/
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// ==/UserScript==

(function() {
    var animations_ = {};

    var createAnimation = (function($elem) {
        var height = $elem._girdle_height;
        if (animations_.hasOwnProperty(height)) {
            return animations_[height];
        }
        var css = document.createElement('style');
        css.type = 'text/css';
        var ruleName = 'slider' + height;
        var rules = document.createTextNode(
            '.' + ruleName + ' {\n' +
                '-webkit-animation-name: anim' + ruleName + ';\n' +
                '-webkit-animation-duration: 0.5s;\n' +
                '}\n' +
                '\n' +
                '.reverse-' + ruleName + ' {\n' +
                '-webkit-animation-name: anim' + ruleName + ';\n' +
                '-webkit-animation-duration: 0.5s;\n' +
                '-webkit-animation-direction: reverse;\n' +
                '}\n' +
                '\n' +
                '@-webkit-keyframes anim' + ruleName + ' {\n' +
                'from { height: 0px; }\n' +
                'to { height: ' + height + 'px; }\n' +
                '}');
        css.appendChild(rules);
        $('head').append(css);
        animations_[height] = ruleName;
        return ruleName;
    });

    var compressed = {};
    var containers = {};

    var engirdle = function () {
        $('.news').each(function(index) {
            $('.alert', this).each(function(index) {
                if ($(this).data("girdled")) {
                    return;
                }
                var alert_type = $(this).attr('class')
                var title_elems = $('.title', this).find('a')

                // grab the user
                var user = $.trim($('.name', '#userbox').text());

                var repo = '';

                // don't handle git_hub fonow.
                if (alert_type === 'alert create') {
                    var key = $(title_elems).get(2);
                    if (key === undefined) {
                        key = $(title_elems).get(0);
                    }
                    repo = $(key).text();
                } else if (alert_type === 'alert gist') {
                    var key = $(title_elems).get(0);
                    repo = $(key).text();
                } else if (alert_type === 'alert follow') {
                    var key = $(title_elems).get(1);
                    if ($(key).text() != user) {
                        key = $(title_elems).get(0);
                    }
                    repo = $(key).text();
                } else if (alert_type === 'alert issues_opened' ||
                           alert_type === 'alert issues_closed' ||
                           alert_type === 'alert issues_reopened') {
                    repo = $($(title_elems).get(2)).text();
                } else if (alert_type === 'alert push' ||
                           alert_type === 'alert commit_comment' ||
                           alert_type === 'alert download' ||
                           alert_type === 'alert delete' ||
                           alert_type === 'alert gollum' ||
                           alert_type === 'alert fork' ||
                           alert_type === 'alert watch_started') {
                    repo = $($(title_elems).get(1)).text();
                } else if (alert_type === 'alert issues_comment') {
                    var repo_elem = $(title_elems).get(2);
                    if (repo_elem === undefined) {
                        // comment on a repo
                        repo_elem = $(title_elems).get(1);
                    }
                    repo = $(repo_elem).text();
                } else {
                    console.log('unknown: ' + alert_type);
                    repo = 'unknown';
                }

                // Add the data to the compressed dictionary, and
                // remove the elements from the page.
                if (!compressed[repo]) {
                    compressed[repo] = [];
                }
                compressed[repo].push($(this));
                $(this).remove();
            });

            for (kk in compressed) {
                (function(k) {
                    if (containers[k]) {
                        $second_title = $('.title:eq(1)', containers[k]);
                        $second_title.empty();
                    } else {
                        var $gh_alert = $('<div class="alert"></div>');
                        $gh_alert.data("girdled", k);
                        containers[k] = $gh_alert;

                        var $body = $('<div class="body"></div>');
                        var $body_alerts = $('<div class="girdle_hidden"></div>');

                        $gh_alert.append($body);

                        var title = '<div class="title"></div>';
                        var $title = $(title);

                        $body.append($title);
                        $body.append($body_alerts);

                        var $name = $('<a href="' + k + '">' + k + '</a>');

                        $title.append($name);
                        var $event_count = '<span class="girdle_event_count"></span>';
                        $title.append($event_count);

                        var $second_title = $(title);
                        $body.append($second_title);

                        var $expand = $('<a id="' + k + '" class="button girdle_right">expand</a>');

                        $expand.click(function() {
                            console.info('clicked');
                            var t = $expand.text();
                            var isExpand = (t === "expand");
                            if ($body_alerts.children().length == 0) {
                                $(compressed[k]).each(function(i, value) {
                                    $(value).appendTo($body_alerts);
                                });
                            }
                            if (isExpand) {
                                $second_title.remove();
                                if (!$body_alerts.hasOwnProperty('_girdle_height')) {
                                    $body_alerts._girdle_height = $body_alerts.height();
                                }
                                $expand.text('compress');
                            } else {
                                $body.append($second_title);
                                $expand.text('expand');
                            }
                            var ruleName = createAnimation($body_alerts);
                            if (!isExpand) {
                                ruleName = 'reverse-' + ruleName;
                            }

                            //$body_alerts[0].className =
                            //$body_alerts[0].className + " " +
                            //ruleName;
                            $body_alerts.addClass(ruleName);
                            console.log($body_alerts);
                            $body_alerts.one('webkitAnimationEnd', function() {
                                $body_alerts.removeClass(ruleName)
                                if (isExpand) {
                                    $body_alerts.height($body_alerts._girdle_height);
                                } else {
                                    $body_alerts.height(0);
                                }
                            });
//                            $body.style.webKitAnimationName = 'slidedown';
                        });

                        $title.append($expand);

                        $('.news').prepend($gh_alert);
                    }

                    $event_count  = $('.girdle_event_count', containers[k]);
                    var event_str = ' had ' + compressed[k].length + ' event';
                    if (compressed[k].length > 1 ) {
                        event_str += 's';
                    }
                    $event_count.text(event_str);

                    $(compressed[k]).each(function(i, value) {
                        var $icon = $('.mini-icon', value).clone();
                        $icon.add('.girdle_icon')
                        $icon.attr('title', $.trim($('.title', value).text()));
                        $second_title.append($icon);
                    });
                })(kk);
            }
        });
    }

    engirdle();

    // Intercept the pageUpdate function and have it call engirdle
    $.fn.pageUpdate = function (a) {
        pageUpdate.call(this, a);
        engirdle();
    }
})()
