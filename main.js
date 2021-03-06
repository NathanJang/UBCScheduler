window.onload = setup
/** @type {Course[]} */
var courses = []
/** @type {number} */
var currBlock = 1
/** @type {Schedule[]} */
var schedules = []
/** @type {Schedule[]} */
var filteredSchedules = []
/** @type {string[]} */
var lockedSections = []
/** @type {number} */
var currPage = 1

function setup() {

    $('#coursesTable > tbody').on('click', '.delete', removeCourse)
    $('#timetable').on('click', '#courseBlock', lockSection)
    $('#schedule-pagination').twbsPagination($.extend({}, defaultOptions, {
        totalPages: 1
    }))

    loadSessions()
    schedule()
}

function loadSessions() {
    parseSessions(function (sessions) {
        $("#sessionLabel").text("Session")
        var dropdown = $("#inputSession")
        $.each(sessions, function () {
            dropdown.append($("<option />").val(this).text(this));
        });
        dropdown.val(sessions[0]);
    })
}

function addCourse() {
    let yearSession = $("#inputSession").val() // 2017W

    // TODO: Need better error handling here
    if (yearSession == null) {
        alert("Please select a session, or wait for it to load if there is none.")
        return
    }

    let campus = $("#inputCampus").val()
    let courseName = $("#inputCourse").val().toUpperCase()
    let term = $("#inputTerm").val()
    let regex = /([A-Z]{4})\s?(\w+)/
    let match = regex.exec(courseName)

    // TODO: Need error handling here
    if (!match) {
        alert("Please enter a valid course code.")
        return
    }
    let subject = match[1]
    let course = match[2]
    courseName = subject + " " + course
    if (courses.filter(function (course) { return course.courseName === courseName }).length > 0) {
        alert("This course has already been added.")
        return
    }

    let year = yearSession.slice(0, -1) // 2017
    let session = yearSession.substr(-1); // W
    $("#buttonAdd").attr("disabled", true);
    $("#buttonAdd").text("Adding...")
    lockSectionAndTerm(true)
    parseSections(campus, year, session, subject, course, term, function (sections) {
        if (!sections) {
            if (courses.length == 0) {
                lockSectionAndTerm(false)
            }
            alert("Course not found.")
            // TODO: Throw a nicer error here
        } else {
            addCourseToTable(courseName, sections)
        }
        $("#buttonAdd").attr("disabled", false);
        $("#buttonAdd").text("Add Course")
    })
}

function lockSectionAndTerm(locked) {
    $("#inputCampus").attr("disabled", locked);
    $("#inputSession").attr("disabled", locked);
    $("#inputTerm").attr("disabled", locked);
    if (locked) {
        $("#timetableLabel").text(`${$("#inputSession").val() + $("#inputTerm").val()} Timetable`)
    } else {
        $("#timetableLabel").text("Timetable")
    }
}

function addEmptyBlock() {
    var weekdayMask = Weekday.None
    // This can be improved with a mask for example
    let mon = $("#weekdayM").attr("aria-pressed") === "true"
    let tue = $("#weekdayT").attr("aria-pressed") === "true"
    let wed = $("#weekdayW").attr("aria-pressed") === "true"
    let thu = $("#weekdayH").attr("aria-pressed") === "true"
    let fri = $("#weekdayF").attr("aria-pressed") === "true"
    let beginTime = $("#inputBeginTime").val()
    let endTime = $("#inputEndTime").val()
    if (mon) weekdayMask += Weekday.Monday
    if (tue) weekdayMask += Weekday.Tuesday
    if (wed) weekdayMask += Weekday.Wednesday
    if (thu) weekdayMask += Weekday.Thursday
    if (fri) weekdayMask += Weekday.Friday

    // TODO: Need validation here
    if (weekdayMask == Weekday.None) {
        alert("Please select one or more days of the week.")
        return
    }
    if (!beginTime) {
        alert("Please enter a beginning time.")
        return
    }
    if (!endTime) {
        alert("Please enter a ending time.")
        return
    }

    addCourseToTable("Block " + currBlock, [{
        status: "", section: "Block " + currBlock, activity: "", subactivities: {}, times: [{
            days: weekdayMask,
            beginTime: LocalTime.parse(beginTime),
            endTime: LocalTime.parse(endTime)
        }]
    }])
    currBlock++
}

function noDeathPls() {
    let courseName = "No 8am"
    if (courses.filter(course => course.courseName === courseName).length > 0) {
        alert("You have already chosen to sleep in.")
        return
    }
    addCourseToTable(courseName, [{
        status: "", section: courseName, activity: "", subactivities: {}, times: [{
            days: Weekday.Monday | Weekday.Tuesday | Weekday.Wednesday | Weekday.Thursday | Weekday.Friday,
            beginTime: LocalTime.parse("08:00"),
            endTime: LocalTime.parse("09:00")
        }]
    }])
}

function schedule() {
    $("#schedule").attr("disabled", true);
    $("#schedule").text("Scheduling...")
    lockedSections = []
    currPage = 1

    var fn = scheduleTimetable.bind(this, courses.slice(0), function (newSchedules) {// schedule using a shallow copy
        schedules = newSchedules
        filteredSchedules = schedules
        updatePaginationTimetable(0)
        $("#schedule").attr("disabled", false);
        $("#schedule").text("Schedule")
    })
    window.requestAnimationFrame(fn)
}

function lockSection() {
    let sectionName = $(this).html().split("<br>")[0]
    if ($(this).hasClass("course-locked")) {
        lockedSections = lockedSections.filter(item => item !== sectionName)
    } else {
        lockedSections.push(sectionName)
    }
    let currentSchedule = filteredSchedules[currPage - 1]
    filteredSchedules = schedules.filter(function (schedule) {
        if (lockedSections.length == 0) return true
        let courseNames = schedule.map(section => section.sectionName)
        return lockedSections.every(lockedSection => courseNames.includes(lockedSection))
    })
    currPage = filteredSchedules.indexOf(currentSchedule) + 1
    updatePaginationTimetable(currPage - 1)
}