var wa_editor_key = false;
var wa_editor;

function waEditorKeyCallback(press, options) {
    var options = options || {};
    options = jQuery.extend({
        'save_button': 'wa-page-button',
        'change_callback': null
    }, options);
    var button = $('#' + options.save_button);
    if (press) {
        return function (e) {
            if (!button.length) {
                return;
            }
            // ctrl + s (Mac OS)
            if (e.ctrlKey && e.which == 115 && !wa_editor_key) {
                button.click();
                e.preventDefault();
            }
        }
    } else {
        return function (e) {
            wa_editor_key = false;
            if (!button.length) {
                return;
            }
            // ctrl + s
            if (e.ctrlKey && e.which == 83) {
                wa_editor_key = true;
                button.click();
                e.preventDefault();
            }
            if (e.metaKey) {
                return;
            }
            if ((e.which < 33 || e.which > 40) &&
                (e.which > 27 || e.which == 8 || e.which == 13) &&
                (e.which < 112 || e.which > 124) &&
                (!e.ctrlKey || e.which != 67)
                ) {
                button.removeClass('green').addClass('yellow');
                if(options.change_callback && (typeof(options.change_callback) == 'function')) {
                    options.change_callback();
                }
            }
        }
    }
}

function waEditorCodeMirrorInit(options)
{
    var options = options || {};
    options = jQuery.extend({
        'prefix': 'wa-page-',
        'id': 'wa-page-content',
        'type': 'html'
    }, options);

    if (!options.save_button) {
        options.save_button = options.prefix + 'button';
    }

    wa_editor = CodeMirror.fromTextArea(document.getElementById(options.id), {
        mode: "text/" + options.type,
        tabMode: "indent",
        height: "dynamic",
        lineWrapping: true,
        onKeyEvent: function (editor, e) {
            var event = jQuery.Event(e);
            if (event.type == 'keydown') {
                waEditorKeyCallback(false, options)(e);
            } else if (event.type = 'keypress') {
                waEditorKeyCallback(true, options)(e);
            }
        }
    });

    $(".CodeMirror-scroll").css('min-height', options.height + 'px');
}


function waEditorUpdateSource(options) {
    var options = options || {};
    options = jQuery.extend({
        'id': 'wa-page-content'
    }, options);
    var element = $('#' + options.id);
    if ($(".el-rte").length && $(".el-rte").is(':visible')) {
        $('.el-rte iframe').contents().find("img[data-src!='']").each(function () {
            $(this).attr('src', $(this).attr('data-src'));
        });
        element.val(element.elrte('val'));
        //element.elrte('val', element.val());
        $('.el-rte iframe').contents().find('img[src*="$wa_url"]').each(function () {
            var s = decodeURIComponent($(this).attr('src'));
            $(this).attr('data-src', s);
            $(this).attr('src', s.replace(/\{\$wa_url\}/, wa_url));
        });
    } else if (wa_editor) {
        element.val(wa_editor.getValue());
    }
}


function waEditorInit(options) {
    var options = options || {};
    options = jQuery.extend({
        'prefix': 'wa-page-',
        'id': 'wa-page-content',
        'lang': 'en'
    }, options);

    if (!options.save_button) {
        options.save_button = options.prefix + 'button';
    }

    var element = $('#' + options.id);

    if (!options.height) {
        var editor_selector = "div." + options.prefix + "editor";
        var h = $(editor_selector).height() - $(editor_selector + " .wa-page-gray-toolbar").height() - 92;
        if ($("div." + options.prefix + 'save-panel').length) {
            h = h - 25;
        }
        if ($("#wa-app").height() < $("#wa").height() - $("#wa-header").height()) {
            h += $("#wa").height() - $("#wa-header").height() - $("#wa-app").height();
        }
        options.height = h < 300 ? 300 : h;
    }

    waEditorCodeMirrorInit(options);

    // init elrte editor
    elRTE.prototype.beforeSave = function () {};
    elRTE.prototype.options.toolbars.waPageToolbar = ['wa_style', 'alignment', 'colors', 'format', 'indent', 'lists', 'wa_image', 'wa_links', 'wa_elements', 'wa_tables', 'direction'];

    // hack for empty elrte in IE
    if (!element.val() && $.browser.msie) {
        element.val('<div></div>');
    }
    element.elrte({
        height: options.height - 53,
        cssfiles: [wa_url + "wa-content/css/wa/wa-1.0.css"],
        toolbar: 'waPageToolbar',
        lang: options.lang,
        wa_image_upload: '?module=pages&action=uploadimage',
        wa_image_upload_path: options.upload_url,
        width: "100%"
    });
    if (element.val() == '<div></div>' && $.browser.msie) {
        element.elrte('val', '');
    }

    var f = element.elrte()[0].elrte.filter.source;
    element.elrte()[0].elrte.filter.source = function (html) {
        var html = f.call(element.elrte()[0].elrte.filter, html);
        html = html.replace(/%7B\$wa_url%7D/, '{$wa_url}');
        html = html.replace(/{[a-z$][^}]*}/gi, function (match, offset, full) {
            var i = full.indexOf("</script", offset + match.length);
            var j = full.indexOf('<script', offset + match.length);
            if (i == -1 || (j != -1 && j < i)) {
                match = match.replace(/&gt;/g, '>');
                match = match.replace(/&lt;/g, '<');
                match = match.replace(/&amp;/g, '&');
                match = match.replace(/&quot;/g, '"');
            }
            return match;
        });
        return html;
    };
    $('.el-rte iframe').contents()
        .keydown(waEditorKeyCallback(false, options))
        .keypress(waEditorKeyCallback(true, options))
        .keyup(function(e) {
            //all dialogs should be closed when Escape is pressed
            if (e.keyCode == 27) {
                jQuery(".dialog:visible").trigger('esc');
            }
        });
    $('.el-rte .toolbar li').click(function () {
        $('#' + options.save_button).removeClass('green').addClass('yellow');
    });

    $('#wa-page-settings').keydown(waEditorKeyCallback(false, options)).keypress(waEditorKeyCallback(true, options));

    // bind click handlers to buttons
    $("#wysiwyg").click(function () {
        if ($.storage) {
            $.storage.set(wa_app + '/editor', 'wysiwyg');
        }
        $('ul#'+options.prefix+'wysiwyg-html-toggle, ul.'+options.prefix+'wysiwyg-html-toggle').children('li.selected').removeClass('selected');
        $(this).parent().addClass('selected');
        $("div.CodeMirror-wrap").hide();
        element.elrte('val', wa_editor.getValue());
        $('.el-rte iframe').contents().find('img[src*="$wa_url"]').each(function () {
            var s = decodeURIComponent($(this).attr('src'));
            $(this).attr('data-src', s);
            $(this).attr('src', s.replace(/\{\$wa_url\}/, wa_url));
        });
        $(".el-rte").show();
        $('.el-rte iframe').contents().find('body').focus();
        return false;
    });

    $("#html").click(function () {
        if ($.storage) {
            $.storage.set(wa_app + '/editor', 'html');
        }
        $('ul#'+options.prefix+'wysiwyg-html-toggle, ul.'+options.prefix+'wysiwyg-html-toggle').children('li.selected').removeClass('selected');
        $(this).parent().addClass('selected');
        $('.el-rte iframe').contents().find("img[data-src!='']").each(function () {
            $(this).attr('src', $(this).attr('data-src'));
        });

        $(".el-rte").hide();
        $("div.CodeMirror-wrap").show();
        wa_editor.setValue(element.elrte('val'));
        wa_editor.focus();
        return false;
    });

    // show active editor
    $('ul#'+options.prefix+'wysiwyg-html-toggle, ul.'+options.prefix+'wysiwyg-html-toggle').children('li.selected').removeClass('selected');
    if (!$.storage || $.storage.get(wa_app + '/editor') == 'wysiwyg') {
        $("#wysiwyg").parent().addClass('selected');
        $('.el-rte iframe').contents().find('img[src*="$wa_url"]').each(function () {
            var s = decodeURIComponent($(this).attr('src'));
            $(this).attr('data-src', s);
            $(this).attr('src', s.replace(/\{\$wa_url\}/, wa_url));
        });
        $("div.CodeMirror-wrap").hide();
    } else {
        $(".el-rte").hide();
        $("#html").parent().addClass('selected');
    }
}
