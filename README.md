# JQuery Calendar

Creates schedule-like table that allows to choose the hours in a week.

![screenshot](//bitbucket.org/aves84/jquery-calendar/raw/default/screenshot.png)

### Usage
```
$([root]).calendar([options])
```
`root {selector}` optional element which will be contain table

`options {Object}` optioanal object with optional options

### Options
- `table {selector}` actually calendar
####*control elements*
- `prev {selector}` switch to previous week
- `today {selector}` switch to current week
- `next {selector}` switch to next week
- `reset {selector}` clear the table
####*output elements*
- `list {selector}` selected intervals
- `total {selector}` sum of hours multiplied by the price
####*settings*
- `monthNames {String}` comma separated months names for use in table title
- `dayNames {String}` comma separated days names for use in table head
- `startHour {Number}` table will start with this hour
- `endHour {Number}` table will end with this hour
####*templates*
- `orderItem {String} (%date% %intervals%)` list item
- `orderInterval {String} (%interval% %count%)` interval format in list
- `orderIntervalJoin {String}` for joining intervals
- `orderEmpty {String}`
- `totalString {String} (%totalprice% %totalhours%)`
- `totalEmpty`
####*output*
- `result {Object}` empty object to access the results externally
