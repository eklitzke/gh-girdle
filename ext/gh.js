// ==UserScript==
// @name           gh-girdle
// @namespace      gh-girdle
// @include        https://github.com/
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// ==/UserScript==

(function() {
    /* Create a CSS tag with the styles that we plan to use; we do
     * this rather than using a real CSS file for portability to Safari
     * and Firefox.
     */

    var head_ = document.getElementsByTagName('head')[0];
    var createCSS = (function (arr) {
        var css = document.createElement('style');
        css.type = 'text/css';
        var reified = '';
        for (var i = 0; i < arr.length; i++) {
            reified += arr[i] + '\n';
        }
        css.appendChild(document.createTextNode(reified));
        head_.appendChild(css);
    });

    createCSS([
        '.button { cursor: pointer; }',
        '',
        '.girdle_hidden { overflow: hidden; }',
        '',
        '.button .girdle_hidden { margin-left: 1em; }',
        '',
        '.girdle_right { float: right; }'])

    /* This is a hack to create an animation rule for animating an
     * element of a given height. This is the only way I (eklitzke)
     * could get this to work properly. It's kind of hacky because it
     * creates up to N rules where N is the number of elements with
     * unique sizes that are expanded. However, the number of events
     * on the page shouldn't be too large (a dozen or two at the
     * most), and the sizes are cached which makes this a little less
     * hacky.
     */
    var animations_ = {};

    var createAnimation = (function($elem) {
        var height = $elem._girdle_height;
        if (animations_.hasOwnProperty(height)) {
            return animations_[height];
        }
        var ruleName = 'slider' + height;
        /* N.B. As of Firefox 13, reverse animations are not
         * supported, so we need extra rules for Firefox.
         */
        createCSS([
            '.' + ruleName + ' {',
            '  animation-name: anim' + ruleName + ';',
            '  animation-duration: 0.5s;',
            '  -moz-animation-name: anim' + ruleName + ';',
            '  -moz-animation-duration: 0.5s;',
            '  -webkit-animation-name: anim' + ruleName + ';',
            '  -webkit-animation-duration: 0.5s;',
            '}',
            '',
            '.reverse-' + ruleName + ' {',
            '  animation-name: reverseAnim' + ruleName + ';',
            '  animation-duration: 0.5s;',
            '  -moz-animation-name: reverseAnim' + ruleName + ';',
            '  -moz-animation-duration: 0.5s;',
            '  -webkit-animation-name: anim' + ruleName + ';',
            '  -webkit-animation-duration: 0.5s;',
            '  -webkit-animation-direction: reverse',
            '}',
            '',
            '@keyframes anim' + ruleName + ' {',
            '  from { height: 0px; }',
            '  to { height: ' + height + 'px; }',
            '}',
            '',
            '@-moz-keyframes anim' + ruleName + ' {',
            '  from { height: 0px; }',
            '  to { height: ' + height + 'px; }',
            '}',
            '',
            '@-webkit-keyframes anim' + ruleName + ' {',
            '  from { height: 0px; }',
            '  to { height: ' + height + 'px; }',
            '}',
            '',
            '@keyframes reverseAnim' + ruleName + ' {',
            '  from { height: ' + height + 'px; }',
            '  to { height: 0px; }',
            '}',
            '',
            '@-moz-keyframes reverseAnim' + ruleName + ' {',
            '  from { height: ' + height + 'px; }',
            '  to { height: 0px }',
            '}',
        ]);
        animations_[height] = ruleName;
        return ruleName;
    });

    var compressed = {};
    var containers = {};

    var engirdle = function () {
        var addAlert = function(type) {return 'alert ' + type;};
        var issueAlerts = ['issues_opened','issues_closed',
                           'issues_reopened'].map(addAlert);
        var otherAlerts = ['push', 'commit_comment', 'download', 'delete',
                           'gollum', 'fork', 'watch_started'].map(addAlert);
        $('.news').each(function(index) {
            $('.alert', this).each(function(index) {
                if ($(this).data("girdled")) {
                    return;
                }
                var alertType = $(this).attr('class')
                var title_elems = $('.title', this).find('a')

                // grab the user
                var user = $.trim($('.name', '#userbox').text());

                var repo = '';

                // don't handle git_hub fonow.
                if (alertType === 'alert create') {
                    var key = $(title_elems).get(2);
                    if (key === undefined) {
                        key = $(title_elems).get(0);
                    }
                    repo = $(key).text();
                } else if (alertType === 'alert gist') {
                    var key = $(title_elems).get(0);
                    repo = $(key).text();
                } else if (alertType === 'alert follow') {
                    var key = $(title_elems).get(1);
                    if ($(key).text() != user) {
                        key = $(title_elems).get(0);
                    }
                    repo = $(key).text();
                } else if (issueAlerts.indexOf(alertType) >= 0) {
                    repo = $($(title_elems).get(2)).text();
                } else if (otherAlerts.indexOf(alertType) >= 0) {
                    repo = $($(title_elems).get(1)).text();
                } else if (alertType === 'alert issues_comment') {
                    var repo_elem = $(title_elems).get(2);
                    if (repo_elem === undefined) {
                        // comment on a repo
                        repo_elem = $(title_elems).get(1);
                    }
                    repo = $(repo_elem).text();
                } else {
                    console.log('unknown: ' + alertType);
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
                        $events = $('.title:eq(1)', containers[k]);
                        $events.empty();
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

                        var $name = $('<a href="' + k + '">' + k + '</a>');

                        $title.append($name);
                        var $event_count = '<span class="girdle_event_count"></span>';
                        $title.append($event_count);

                        var $events = $('<div></div>')
                        $body.append($events);

                        $body.append($body_alerts);

                        var $expand = $('<a id="' + k + '" class="button girdle_right">expand</a>');

                        $expand.click(function() {
                            var t = $expand.text();
                            var isExpand = (t === "expand");
                            if ($body_alerts.children().length == 0) {
                                $(compressed[k]).each(function(i, value) {
                                    $(value).appendTo($body_alerts);
                                });
                            }
                            if (isExpand) {
                                $events.remove();
                                if (!$body_alerts.hasOwnProperty('_girdle_height')) {
                                    $body_alerts._girdle_height = $body_alerts.height();
                                }
                            } else {
                                $body.append($events);
                            }
                            var ruleName = createAnimation($body_alerts);
                            if (!isExpand) {
                                ruleName = 'reverse-' + ruleName;
                            }

                            $body_alerts.addClass(ruleName);
                            $body_alerts.one('animationend mozAnimationEnd webkitAnimationEnd', function() {
                                $body_alerts.removeClass(ruleName)
                                if (isExpand) {
                                    if ($body_alerts.height !== $body_alerts._girdle_height) {
                                        $body_alerts.height($body_alerts._girdle_height);
                                    }
                                    $expand.text('compress');
                                } else {
                                    $body_alerts.height(0);
                                    $expand.text('expand');
                                }
                            });
                        });

                        $title.append($expand);
                        $title.append($('<div style="clear: both"></div>'));

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
                        $icon.css({'position': 'relative', 'margin-right': '5px', 'margin-top': '5px'});
                        $icon.attr('title', $.trim($('.title', value).text()));
                        $events.append($icon);
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
