(function($) {
    /* Options:
        css selectors: table, prev, today, next, reset, list, total,
        values: mounthsNames, dayNames, startHour, endHour, shiftTodayHour
        html strings with (patterns): orderItem (%date% %intervals%), orderInterval (%interval% %count%), orderIntervalJoin, orderEmpty, totalString (%totalprice% %totalhours%), totalEmpty
        object: result
        string: dateFormat (%d%m%y)
    */

    var defaults = {
        elements: {
            'table': '<table/>',
            'prev': '<input type="button" value="prev">',
            'today': '<input type="button" value="today">',
            'next': '<input type="button" value="next">',
            'reset': '<input type="button" value="reset">',
            'list': '<ul/>',
            'total': '<h4/>'
        },
        names: {
            months: 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec',
            days: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun'
        },
        hours: { start: 6, end: 22, shiftToday: 3},
        templates: {
            orderItem: '<li><div class="o-date">%date%:</div><div class="o-time">%intervals%</div></li>',
            orderInterval: '<span>%interval%, %count%</span>',
            orderIntervalJoin: '<br>',
            orderEmpty: '<li class="message">No time chosen.</li>',
            totalString: '%totalprice% for %totalhours% hours',
            totalEmpty: '0'
        }
    };

    var weekend = ['Sat', 'Sun'];
    var priceTable = {
        weekEnd: { first: [], last: [] },
        weekDays: { first: [], last: [] }
    };
    for (var i = 0; i < 24 * 2; i++) {
        if (i >= 6 * 2 && i < 20 * 2) {
            priceTable.weekDays.first[i] = 29.75;
            priceTable.weekDays.last[i] = 29.75;
            priceTable.weekEnd.first[i] = 34.75;
            priceTable.weekEnd.last[i] = 29.75;
        } else {
            priceTable.weekDays.first[i] = 34.75;
            priceTable.weekDays.last[i] = 29.75;
            priceTable.weekEnd.first[i] = 34.75;
            priceTable.weekEnd.last[i] = 29.75;
        }
    }

    function Day() {}
    Day.prototype = [];
    Day.prototype.toJSON = function() { return this.slice() };
    while (Day.prototype.length < 48) Day.prototype[Day.prototype.length] = 0;

    $.fn.calendar = function(options) {
        var config = {};
        config.$form = this.first('form');
        if (!config.$form.length) config.$form = $('<form/>').appendTo(this.length ? this : $('body'));
        if (typeof options != 'object') options = {};
        for (var type in defaults) {
            Object.keys(defaults[type]).forEach(function(e) {
                var k;
                switch (type) {
                    case 'elements':
                        k = '$' + e;
                        config[k] = e in options ? $(options[e] + ':first') : $(defaults[type][e]).appendTo(config.$form);
                        break;
                    case 'names':
                        k = e + 'Names';
                        config[k] = (k in options ? options[k] : defaults[type][e]).split(',');
                        break;
                    case 'hours':
                        k = e + 'Hour';
                        config[k] = k in options ? options[k] : defaults[type][e];
                        break;
                    case 'templates':
                        k = 'template' + e[0].toUpperCase() + e.slice(1);
                        config[k] = e in options ? options[e] : defaults[type][e];
                        break;
                }
            });
        }

        var today = new Date();
        var dayNum = (today.getDay() || 7) - 1;
        var startDate = today - dayNum * 24 * 60 * 60 * 1000;

        var result = options.result || {};
        Object.defineProperties(result, {
            price: { enumerable: false, writable: true },
            hours: { enumerable: false, writable: true },
            toJSON: {
                configurable: true,
                enumerable: false,
                value: function() {
                    var d, j = [];
                    for (var k in this) {
                        d = {};
                        d[formatDate(k)] = formatIntervals(this[k]);
                        j.push(d);
                    }
                    j.push({
                        price: this.price,
                        hours: this.hours
                    });
                    return j;
                }
            }
        });
        var selection = {};
        var week;

        function formatDate(date) {
            if (!options.dateFormat) return date;
            if (!(date instanceof Date)) date = new Date(date);
            return options.dateFormat.replace(/%(.)/g, function(s, p) {
                switch (p) {
                    case 'd': return ('0' + date.getDate()).slice(-2);
                    case 'm': return ('0' + date.getMonth()).slice(-2);
                    case 'y': return date.getFullYear();
                }
                return s;
            });

        }

        function formatIntervals(day) {
            var intervals = calcIntervals(day);
            return intervals.map(function(interval){
                var start = (interval.start / 2 | 0) + ':' + (interval.start % 2 ? '30' : '00');
                var end = (interval.end / 2 | 0) + ':' + (interval.end % 2 ? '30' : '00');
                var data = {
                    interval: start + ' - ' + end,
                    count: (interval.end - interval.start) / 2
                };
                return data;
            });
        }

        function composeWeek() {
            week = [];
            for (var i = 0; i < 7; i++) {
                week[i] = new Date(startDate + i * 24 * 60 * 60 * 1000);
            }
        }

        function composeCaption() {
            var d1 = week[0];
            var d2 = week[6];
            d1 = {
                d: d1.getDate(),
                m: d1.getMonth(),
                y: d1.getFullYear()
            };
            d2 = {
                d: d2.getDate(),
                m: d2.getMonth(),
                y: d2.getFullYear()
            };
            if (d1.m == d2.m) {
                return [d1.d + '-' + d2.d, config.monthsNames[d1.m], d1.y].join('. ');
            } else if (d1.y == d2.y) {
                return [d1.d, config.monthsNames[d1.m], '- ' + d2.d, config.monthsNames[d2.m], d1.y].join('. ');
            } else {
                return [d1.d, config.monthsNames[d1.m], d1.y, '- ' + d2.d, config.monthsNames[d2.m], d2.y].join('. ');
            }
        }

        function buildTable() {
            $('<caption/>')
                .html($('<span/>')
                    .text(composeCaption()))
                .appendTo(config.$table)
                .prepend(config.$prev)
                .append(config.$next);
            $('<colgroup/>')
                .append(week.map(function(e) {
                    var $el = $('<col/>');
                    var day = e.getDay();
                    if (day === 0 || day == 6) $el.addClass('weekend');
                    if (day == today.getDay()) $el.addClass('today');
                    return $el;
                }))
                .appendTo(config.$table);
            $('<tr/>')
                .append(config.daysNames.map(function(e) { return '<th>' + e + '</th>' }))
                .appendTo(config.$table);
            for (var hour = config.startHour; hour < config.endHour; hour++) {
                $('<tr/>')
                    .append(week.map(function() { return '<td>' + hour + ' - ' + (hour + 1) + '</td>' }))
                    .appendTo(config.$table);
            }
        }

        function calcSelection() {
            selection.maxDay = Math.max(selection.dayStart, selection.dayEnd);
            selection.minDay = Math.min(selection.dayStart, selection.dayEnd);
            selection.maxHour = Math.max(selection.hourStart, selection.hourEnd);
            selection.minHour = Math.min(selection.hourStart, selection.hourEnd);
        }

        function drawSelection() {
            config.$table
                .find('td')
                .each(function(i, td) {
                    var isDayMatch = td.cellIndex >= selection.minDay && td.cellIndex <= selection.maxDay;
                    var isHourMatch = td.parentNode.rowIndex >= selection.minHour + 1 && td.parentNode.rowIndex <= selection.maxHour + 1;
                    if (isDayMatch && isHourMatch) $(td).addClass('selected');
                    else $(td).removeClass('selected');
                });
        }

        function drawChecked() {
            config.$table.find('td').each(function(i, td) {
                var dateName = week[td.cellIndex].toDateString();
                var h = (this.parentNode.rowIndex - 1 + config.startHour) * 2;
                var diffWithToday = new Date(dateName) - new Date(today.toDateString());
                var isPast = diffWithToday < 0 || (diffWithToday === 0 && h <= (new Date().getHours() + config.shiftTodayHour) * 2);
                if (isPast) {
                    $(this).addClass('past').removeClass('checked checked-half half-top half-bottom');
                } else {
                    $(this).removeClass('past');
                    if (dateName in result) {
                        var day = result[dateName];
                        if (day[h] && day[h + 1]) $(this).removeClass('checked-half half-top half-bottom').addClass('checked');
                        else if (day[h]) $(this).removeClass('checked half-bottom').addClass('checked-half half-top');
                        else $(this).removeClass('checked checked-half half-top half-bottom');
                    } else {
                        $(this).removeClass('checked checked-half half-top half-bottom');
                    }
                }
            });
        }

        function cellSwitch(dayName, h) {
            var day = result[dayName];
            if (day[h] && day[h + 1] && day[h - 2] && day[h - 1]) { // отмечены текущая и предыдущая, текущая в половину
                result[dayName][h + 1] = 0;
                if (day[h + 2] && !day[h + 3]) day[h + 3] = 1; // если следующая половина, следующую в полную
            } else if (day[h] && day[h + 1] && !day[h - 1]) { // отмечена текущая, предыдущая пустая или половина, текущую в пустую
                day[h] = 0;
                day[h + 1] = 0;
                if (day[h + 2] && !day[h + 3]) day[h + 3] = 1; // если следующая половина, следующую в полную
            } else if (day[h]) { // текущая половина, текущую в пустую
                day[h] = 0;
            } else { // текущую в полную
                day[h] = 1;
                day[h + 1] = 1;
            }
        }

        function weekSwitch(date) {
            startDate = date;
            composeWeek();
            config.$table.find('caption span').text(composeCaption());
            config.$table.find('col').each(function(i, el) {
                if (week[i].toDateString() == today.toDateString()) $(el).addClass('today');
                else $(el).removeClass('today');
            });
            drawChecked();
        }

        function showResult() {
            var html = Object.keys(result).map(composeOrderItem).filter(function(e) { return e });
            config.$list.html(html.length ? html : config.templateOrderEmpty);

            var total = Object.keys(result).reduce(reduceTotal, { price: 0, hours: 0 });
            if (total.price) total.price = total.price.toFixed(2);
            config.$total.html(total.price ? config.templateTotalString.replace(/%total(.+?)%/g, function(s, p) { return total[p] }) : config.templateTotalEmpty);

            result.price = total.price;
            result.hours = total.hours;
        }

        function reduceTotal(total, dateName) {
            if (dateName == 'price') return total;
            result[dateName].forEach(function(e, i, hours) {
                if (e) {
                    var type = weekend.indexOf(dateName.split(' ').shift()) == -1 ? 'weekDays' : 'weekEnd';
                    var pos = (hours[i - 1] && hours[i - 2]) ? 'last' : 'first';
                    total.price += priceTable[type][pos][i] / (pos == 'first' ? 2 : 1);
                    total.hours += 0.5;
                }
            });
            return total;
        }

        function calcIntervals(day) {
            var res = [];
            for (var i = 0; i < day.length; i++) {
                var last = res.pop() || {};
                if (day[i]) {
                    if (!last.start) {
                        last.start = i;
                        last.end = i + 1;
                    } else if (last.end == i) {
                        last.end = i + 1;
                    }
                    res.push(last);
                } else {
                    if (last.start) {
                        res.push(last);
                    }
                    res.push({});
                }
            }
            if (!res[res.length - 1].end) res.pop();
            return res;
        }

        function composeOrderItem(dateName) {
            var res = calcIntervals(result[dateName]);
            var data = {
                date: options.dateFormat ? formatDate(dateName) : dateName,
                intervals: res.map(composeIntervalHtml).join(config.templateOrderIntervalJoin)
            };
            return data.intervals ? config.templateOrderItem.replace(/%(.+?)%/g, function(s, p) { return data[p] }) : null;

        }

        function composeIntervalHtml(interval) {
            var start = (interval.start / 2 | 0) + ':' + (interval.start % 2 ? '30' : '00');
            var end = (interval.end / 2 | 0) + ':' + (interval.end % 2 ? '30' : '00');
            var data = {
                interval: start + ' - ' + end,
                count: (interval.end - interval.start) / 2
            };
            return config.templateOrderInterval.replace(/%(.+?)%/g, function(s, p) { return data[p] });
        }

        config.$prev.click(function() {
            weekSwitch(startDate - 7 * 24 * 60 * 60 * 1000);
        });
        config.$next.click(function() {
            weekSwitch(startDate + 7 * 24 * 60 * 60 * 1000);
        });
        config.$today.click(function() {
            weekSwitch(today - (today.getDay() - 1) * 24 * 60 * 60 * 1000);

        });
        config.$reset.click(function() {
            Object.keys(result).forEach(function(e) {
                delete result[e];
            });
            result.hours = undefined;
            result.price = undefined;
            drawChecked();
            config.$list.html(config.templateOrderEmpty);
            config.$total.text(config.templateTotalEmpty);
        });

        config.$table.on('mousedown', 'td', function() {
            selection.dayStart = selection.dayEnd = this.cellIndex;
            selection.hourStart = selection.hourEnd = this.parentNode.rowIndex - 1;
            $(this).addClass('selected');
        });
        config.$table.on('mouseover mouseout', 'td', function(e) {
            if (e.buttons == 1) {
                selection.dayEnd = this.cellIndex;
                selection.hourEnd = this.parentNode.rowIndex - 1;
                calcSelection();
                drawSelection();
            }
        });
        config.$table.on('mouseup', 'td', function() {
            today = new Date();
            if (!('dayStart' in selection) || !('hourStart' in selection)) return;
            calcSelection();
            var dateName = week[selection.dayStart].toDateString();
            if (!(dateName in result)) result[dateName] = new Day();
            var h = (selection.hourStart + config.startHour) * 2;
            var action = +!Boolean(result[dateName][h] + result[dateName][h + 1]);
            var diffWithToday = new Date(dateName) - new Date(today.toDateString());
            var isPast = diffWithToday < 0 || (diffWithToday === 0 && h <= today.getHours() * 2 + config.shiftTodayHour);
            if (selection.minDay == selection.maxDay && selection.minHour == selection.maxHour) {
                if (!isPast) {
                    cellSwitch(dateName, h);
                } else {
                    result[dateName][h] = 0;
                    result[dateName][h + 1] = 0;
                }
            } else {
                for (var day = selection.minDay; day <= selection.maxDay; day++) {
                    dateName = week[day].toDateString();
                    if (!(dateName in result)) result[dateName] = new Day();
                    for (h = selection.minHour + config.startHour; h <= selection.maxHour + config.startHour; h++) {
                        diffWithToday = new Date(dateName) - new Date(today.toDateString());
                        isPast = diffWithToday < 0 || (diffWithToday === 0 && h <= today.getHours() + config.shiftTodayHour);
                        var currentAction = isPast ? 0 : action;
                        result[dateName][h * 2] = currentAction;
                        result[dateName][h * 2 + 1] = currentAction;
                    }
                }
            }
            selection = {};
            config.$table.find('td').removeClass('selected');
            drawChecked();
            showResult();
        });

        composeWeek();
        buildTable();
        drawChecked();
        showResult();
    };
})(jQuery);
