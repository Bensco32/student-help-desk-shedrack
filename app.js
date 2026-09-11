(function () {
  "use strict";

  var DB_KEY = "common-room-helpdesk-db-v1";
  var SESSION_KEY = "common-room-helpdesk-session-v1";
  var EVENT_KEY = "common-room-helpdesk-event-v1";
  var app = document.getElementById("app");
  var selectedTicketId = null;
  var notifications = 0;
  var channel = null;

  var lecturersSeed = [
    { id: "lecturer-amaka", staffId: "STAFF-1042", fullName: "Dr. Amaka Okafor", department: "Computer Science", initials: "AO", password: "lecturer123" },
    { id: "lecturer-tunde", staffId: "STAFF-1038", fullName: "Dr. Tunde Adeyemi", department: "Mathematics", initials: "TA", password: "lecturer123" },
    { id: "lecturer-grace", staffId: "STAFF-1087", fullName: "Mrs. Grace Bello", department: "Business Administration", initials: "GB", password: "lecturer123" },
    { id: "lecturer-ifeanyi", staffId: "STAFF-1016", fullName: "Dr. Ifeanyi Nwosu", department: "Electrical Engineering", initials: "IN", password: "lecturer123" }
  ];
  var studentsSeed = [
    { id: "student-amina", fullName: "Amina Yusuf", email: "amina.yusuf@campus.edu", department: "Computer Science", matricNumber: "CSC/2024/0142", initials: "AY", password: "student123" }
  ];

  function safeCopy(value) { return JSON.parse(JSON.stringify(value)); }
  function isoDate(date) { return (date || new Date()).toISOString(); }
  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map(function (part) { return (part[0] || "").toUpperCase(); }).join("");
  }
  function publicStudent(student) {
    var copy = safeCopy(student); delete copy.password; return copy;
  }
  function publicLecturer(lecturer) {
    var copy = safeCopy(lecturer); delete copy.password; return copy;
  }
  function seedDb() {
    if (localStorage.getItem(DB_KEY)) return;
    var amina = publicStudent(studentsSeed[0]);
    var amaka = publicLecturer(lecturersSeed[0]);
    var tunde = publicLecturer(lecturersSeed[1]);
    var tickets = [
      {
        id: "HD-1048", category: "Missing Grades", subject: "CSC 301 result not showing on portal",
        message: "My second semester result for CSC 301 is not showing on the student portal, although I submitted the examination.",
        status: "in_progress", createdAt: "2025-03-12T08:42:00.000Z", updatedAt: "2025-03-12T11:16:00.000Z",
        student: amina, lecturer: amaka,
        messages: [
          { id: "msg-1048-1", authorType: "student", authorName: "Amina Yusuf", message: "My second semester result for CSC 301 is not showing on the student portal, although I submitted the examination.", createdAt: "2025-03-12T08:42:00.000Z" },
          { id: "msg-1048-2", authorType: "lecturer", authorName: "Dr. Amaka Okafor", message: "Thanks for flagging this, Amina. I am checking the departmental result sheet and will update you shortly.", createdAt: "2025-03-12T11:16:00.000Z" }
        ]
      },
      {
        id: "HD-1043", category: "Timetable Clash", subject: "Two classes scheduled at the same time",
        message: "MTH 204 and GST 202 are both showing on my timetable for Tuesday at 10:00 AM.",
        status: "open", createdAt: "2025-03-11T14:05:00.000Z", updatedAt: "2025-03-11T14:05:00.000Z",
        student: amina, lecturer: tunde,
        messages: [{ id: "msg-1043-1", authorType: "student", authorName: "Amina Yusuf", message: "MTH 204 and GST 202 are both showing on my timetable for Tuesday at 10:00 AM.", createdAt: "2025-03-11T14:05:00.000Z" }]
      },
      {
        id: "HD-1039", category: "Assignment Issues", subject: "Unable to submit group assignment",
        message: "The submission page keeps timing out when I try to upload our group project PDF.",
        status: "resolved", createdAt: "2025-03-10T09:18:00.000Z", updatedAt: "2025-03-10T12:21:00.000Z",
        student: amina, lecturer: amaka,
        messages: [
          { id: "msg-1039-1", authorType: "student", authorName: "Amina Yusuf", message: "The submission page keeps timing out when I try to upload our group project PDF.", createdAt: "2025-03-10T09:18:00.000Z" },
          { id: "msg-1039-2", authorType: "lecturer", authorName: "Dr. Amaka Okafor", message: "The portal issue has been resolved. Please try uploading again, and keep a copy of the confirmation screen.", createdAt: "2025-03-10T12:21:00.000Z" }
        ]
      }
    ];
    saveDb({ students: studentsSeed, lecturers: lecturersSeed, tickets: tickets, messageCounter: 20, ticketCounter: 1050 });
  }
  function getDb() { seedDb(); return JSON.parse(localStorage.getItem(DB_KEY)); }
  function saveDb(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
  function getSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (_) { return null; } }
  function saveSession(session) { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }
  function ticketById(db, id) { return db.tickets.find(function (ticket) { return ticket.id === id; }); }
  function sortOldest(a, b) { return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); }
  function formatDate(value, includeTime) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-NG", includeTime ? { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric" }).format(date);
  }
  function statusText(status) { return status === "in_progress" ? "In progress" : status.charAt(0).toUpperCase() + status.slice(1); }
  function statusPill(status) { return '<span class="status status-' + status + '">' + statusText(status) + "</span>"; }
  function emitChange(message) {
    var event = { id: Date.now(), message: message || "Ticket updated" };
    localStorage.setItem(EVENT_KEY, JSON.stringify(event));
    if (channel) channel.postMessage(event);
    showToast(message || "Ticket updated");
  }
  function showToast(message) {
    var old = document.querySelector(".toast"); if (old) old.remove();
    var toast = document.createElement("div"); toast.className = "toast"; toast.textContent = message; document.body.appendChild(toast);
    window.setTimeout(function () { toast.remove(); }, 4200);
  }
  function go(route) { window.location.hash = route; }
  function shellBrand() {
    return '<a class="brand" href="#home"><span class="brand-mark">⌂</span><span>Common Room<span class="brand-sub">University support desk</span></span></a>';
  }
  function authHeader(back) {
    return '<header class="topbar wrap">' + shellBrand() + '<a class="btn btn-quiet" href="' + (back || "#home") + '">Back home</a></header>';
  }
  function pageHome() {
    app.innerHTML =
     '<div class="app-noise animate"><header class="topbar wrap">' + shellBrand() + '<div class="topbar-account"><span class="hide-mobile">Already have an account?</span> <a class="btn btn-quiet" href="#student-login">Sign in</a></div></header>' +
       '<main><section class="hero wrap"><div><div class="eyebrow">Student support, made human</div><h1 class="display">A calmer way to ask for help.</h1><p class="hero-copy">Common Room is the university helpdesk for the questions that matter. Start a private conversation, follow its progress, and know who is helping.</p><div class="actions"><a class="btn btn-primary" href="#student-login">Student portal <span aria-hidden="true">→</span></a><a class="btn btn-secondary" href="#lecturer-login">Lecturer portal <span aria-hidden="true">→</span></a></div><div class="trust-row"><span>Private by design</span><span>Clear next steps</span></div></div><div class="mock-desk"><div class="mock-window"><div class="mock-head"><div><small>Your support desk</small><strong>Good morning, Amara</strong></div><span class="mock-avatar">CR</span></div><div class="mock-request"><div class="status-line"><b>Active request</b><em>In progress</em></div><h3>Choosing modules for next semester</h3><p>Academic advising · Updated 18 min ago</p><div class="avatar-stack"><span>AO</span><span>MK</span></div></div><div class="mock-stats"><div class="mock-stat"><strong>03</strong><small>Total requests</small></div><div class="mock-stat"><strong>01</strong><small>Resolved</small></div></div></div><div class="mock-note"><i>?</i><span>Every request has a real person on the other side.</span></div></div></section><section class="process"><div class="process-grid wrap"><div><div class="eyebrow">01 / Ask clearly</div><p>Choose a category and tell us what is getting in the way. A few useful details go a long way.</p></div><div><div class="eyebrow">02 / Stay in the loop</div><p>Your request is routed to the right lecturer, with a visible status from open to resolved.</p></div><div><div class="eyebrow">03 / Move forward</div><p>Reply when you need to. Close the conversation when it has helped — or reopen it if something changes.</p></div></div></section><section class="portal-section wrap"><div><div class="eyebrow">Two doors, one standard</div><h2 class="display">Support that respects your time.</h2></div><div class="portal-cards"><article class="portal-card"><div class="card-mark">+</div><h3>For students</h3><p>A private place to ask questions about learning, access, wellbeing, and campus life.</p><a href="#register">Create your account →</a></article><article class="portal-card alt"><div class="card-mark">○</div><h3>For lecturers</h3><p>An oldest-first queue that keeps the human context attached to every request.</p><a href="#lecturer-login">Open lecturer sign in →</a><a class="portal-card-secondary-link" href="#staff-register">Register institute staff →</a></article></div></section></main><footer class="footer wrap"><span>Common Room · University support desk</span><span>Here to help you continue.</span></footer></div>';
  }
  function pageAuth(mode) {
     var isStaffRegister = mode === "staff-register";
     var isRegister = mode === "register" || isStaffRegister;
    var isLecturer = mode === "lecturer-login";
     var title = isStaffRegister ? "Make room for every student." : isRegister ? "Make room for better questions." : isLecturer ? "Welcome back to the queue." : "Welcome back, student.";
     var intro = isStaffRegister ? "Create your institute staff account to receive and respond to student support requests." : isRegister ? "Set up your student account to start a private conversation with your support team." : isLecturer ? "Sign in to work through the requests waiting for your attention." : "Sign in to pick up where you left off with your support team.";
     var label = isStaffRegister ? "Institute staff registration" : isRegister ? "Student registration" : isLecturer ? "Lecturer sign in" : "Student sign in";
    var fields = "";
     if (isRegister) fields += '<div class="field"><label for="full-name">Full name</label><input id="full-name" required placeholder="e.g. Amara Okafor" /></div><div class="field"><label for="email">' + (isStaffRegister ? "Institute email" : "University email") + '</label><input id="email" required type="email" placeholder="you@university.edu" /></div><div class="field"><label for="department">Department</label><input id="department" required placeholder="e.g. Computer Science" /></div>';
     fields += isLecturer || isStaffRegister ? '<div class="field"><label for="staff-id">Staff ID</label><input id="staff-id" required placeholder="e.g. STAFF-1042" /></div>' : '<div class="field"><label for="matric-number">Matric number</label><input id="matric-number" required placeholder="e.g. CSC/2024/0142" /></div>';
    fields += '<div class="field"><label for="password">Password</label><input id="password" required type="password" minlength="6" placeholder="At least 6 characters" /></div>';
     if (isStaffRegister) fields += '<div class="field"><label for="confirm-password">Confirm password</label><input id="confirm-password" required type="password" minlength="6" placeholder="Repeat your password" /></div>';
     var hint = isLecturer ? '<div class="hint">Use your staff ID and password to sign in. Newly registered institute staff can access the queue immediately.</div>' : (!isRegister ? '<div class="hint">Demo student: <strong>CSC/2024/0142</strong> · <strong>student123</strong></div>' : isStaffRegister ? '<div class="hint">Your staff ID becomes your sign-in ID and your account is active as soon as registration is complete.</div>' : "");
     var formLink = isStaffRegister ? 'Already have a staff account? <a href="#lecturer-login">Sign in</a>' : isRegister ? 'Already registered? <a href="#student-login">Sign in</a>' : 'Need a student account? <a href="#register">Register here</a>';
     if (isLecturer) formLink += ' <span class="form-link-divider">·</span> New institute staff? <a href="#staff-register">Register here</a>';
     app.innerHTML = '<div class="auth-page app-noise animate">' + authHeader() + '<main class="auth-layout"><div class="auth-copy"><div class="eyebrow">' + label + '</div><h1 class="display">' + title + '</h1><p>' + intro + '</p><div class="auth-points"><span>Your details stay with the assigned support team.</span><span>You can reply, close, or reopen a request anytime.</span></div></div><section class="form-card"><div class="eyebrow">' + label + '</div><h2>' + (isStaffRegister ? "Create your staff account" : isRegister ? "Create your account" : "Sign in to Common Room") + '</h2><div id="auth-error" class="notice hidden"></div><form id="auth-form" class="form-stack">' + fields + hint + '<button class="btn btn-primary" type="submit">' + (isStaffRegister ? "Register staff account" : isRegister ? "Create student account" : "Continue") + ' <span aria-hidden="true">→</span></button></form><div class="form-foot">' + formLink + '</div>' + (isLecturer ? '<div class="form-foot">Staff accounts in directory: ' + getDb().lecturers.length + '</div>' : "") + '</section></main></div>';
    document.getElementById("auth-form").addEventListener("submit", function (event) { event.preventDefault(); handleAuth(mode); });
  }
  function handleAuth(mode) {
    var db = getDb(), error = document.getElementById("auth-error"), password = document.getElementById("password").value;
    var session = null;
    if (mode === "register") {
      var name = document.getElementById("full-name").value.trim(), email = document.getElementById("email").value.trim(), department = document.getElementById("department").value.trim(), matric = document.getElementById("matric-number").value.trim();
      if (db.students.some(function (student) { return student.matricNumber.toLowerCase() === matric.toLowerCase(); })) return authError(error, "That matric number is already registered.");
      var student = { id: "student-" + Date.now(), fullName: name, email: email, department: department, matricNumber: matric, initials: initials(name), password: password };
      db.students.push(student); saveDb(db); session = makeSession("student", student);
     } else if (mode === "staff-register") {
       var staffName = document.getElementById("full-name").value.trim(), staffEmail = document.getElementById("email").value.trim(), staffDepartment = document.getElementById("department").value.trim(), staffId = document.getElementById("staff-id").value.trim().toUpperCase(), confirmPassword = document.getElementById("confirm-password").value;
       if (db.lecturers.some(function (lecturer) { return lecturer.staffId.toLowerCase() === staffId.toLowerCase(); })) return authError(error, "That staff ID is already registered.");
       if (db.lecturers.some(function (lecturer) { return lecturer.email && lecturer.email.toLowerCase() === staffEmail.toLowerCase(); })) return authError(error, "That institute email is already registered.");
       if (password !== confirmPassword) return authError(error, "The passwords do not match.");
       var staff = { id: "lecturer-" + Date.now(), staffId: staffId, fullName: staffName, email: staffEmail, department: staffDepartment, initials: initials(staffName), password: password };
       db.lecturers.push(staff); saveDb(db); session = makeSession("lecturer", staff);
    } else if (mode === "lecturer-login") {
      var staff = document.getElementById("staff-id").value.trim().toLowerCase(), lecturer = db.lecturers.find(function (item) { return item.staffId.toLowerCase() === staff && item.password === password; });
      if (!lecturer) return authError(error, "The staff ID or password is incorrect.");
      session = makeSession("lecturer", lecturer);
    } else {
      var matricNumber = document.getElementById("matric-number").value.trim().toLowerCase(), found = db.students.find(function (item) { return item.matricNumber.toLowerCase() === matricNumber && item.password === password; });
      if (!found) return authError(error, "The matric number or password is incorrect.");
      session = makeSession("student", found);
    }
    saveSession(session); selectedTicketId = null; notifications = 0; go(session.userType === "student" ? "#student" : "#lecturer");
  }
  function authError(element, message) { element.textContent = message; element.classList.remove("hidden"); }
  function makeSession(type, user) { return { userType: type, userId: user.id, displayName: user.fullName, initials: user.initials, department: user.department }; }
  function currentUser(db, session) { return session.userType === "student" ? db.students.find(function (item) { return item.id === session.userId; }) : db.lecturers.find(function (item) { return item.id === session.userId; }); }
  function ownedTickets(db, session) {
    var list = db.tickets.filter(function (ticket) { return session.userType === "student" ? ticket.student.id === session.userId : ticket.lecturer.id === session.userId; }).sort(sortOldest);
    if (session.userType === "student") list.forEach(function (ticket) { var last = ticket.messages[ticket.messages.length - 1]; if (ticket.status === "in_progress" && last && last.authorType === "lecturer") ticket.status = "resolved"; });
    return list;
  }
  function summary(tickets) { return { total: tickets.length, open: tickets.filter(function (t) { return t.status === "open"; }).length, inProgress: tickets.filter(function (t) { return t.status === "in_progress"; }).length, resolved: tickets.filter(function (t) { return t.status === "resolved"; }).length, closed: tickets.filter(function (t) { return t.status === "closed"; }).length }; }
  function pageDesk(role) {
    var session = getSession(), db = getDb();
    if (!session || session.userType !== role) return go(role === "student" ? "#student-login" : "#lecturer-login");
    if (selectedTicketId && !ticketById(db, selectedTicketId)) selectedTicketId = null;
    var user = currentUser(db, session), tickets = ownedTickets(db, session);
    var s = summary(tickets);
    app.innerHTML = '<div class="desk-page animate"><div class="desk-shell"><aside class="side-nav">' + shellBrand() + '<div class="nav-label">Workspace</div><a class="nav-link active" href="#' + role + '"><span class="nav-dot"></span>' + (role === "student" ? "My requests" : "Assigned queue") + '</a><a class="nav-link" href="#' + role + '" data-scroll="summary"><span class="nav-dot"></span>Overview</a><div class="side-help"><strong>' + (role === "student" ? "Need a hand?" : "Response rhythm") + '</strong>' + (role === "student" ? "Choose the person closest to your question. Clear details help us help you faster." : "Start with the oldest request so every student gets a fair next step.") + '</div></aside><main class="desk-main"><header class="desk-topbar"><span class="live-state">Live updates on</span><button class="notif" id="notification-button" aria-label="Notifications"><span aria-hidden="true">•</span><span class="badge">' + Math.min(notifications, 9) + '</span></button><div class="user-chip"><span>' + session.initials + '</span><div><strong>' + session.displayName + '</strong><small>' + session.department + '</small></div></div><button class="sign-out" id="sign-out">Sign out</button></header><div class="desk-content"><div class="desk-heading"><div><div class="eyebrow">' + (role === "student" ? "Student support desk" : "Lecturer support desk") + '</div><h1 class="display">' + (role === "student" ? "Your requests" : "Assigned queue") + '</h1><p>' + (role === "student" ? "A clear place to ask, follow up, and keep moving." : "The oldest request is the next person waiting for you.") + '</p></div>' + (role === "student" ? '<button class="btn btn-primary" id="new-ticket">+ New help request</button>' : '<div class="btn btn-secondary btn-small">Oldest first · ' + tickets.length + ' waiting</div>') + '</div><div class="summary-grid" id="summary"><div class="summary-card"><div class="mono">' + String(s.total).padStart(2, "0") + '</div><small>Total requests</small></div><div class="summary-card open"><div class="mono">' + String(s.open).padStart(2, "0") + '</div><small>Open</small></div><div class="summary-card progress"><div class="mono">' + String(s.inProgress).padStart(2, "0") + '</div><small>In progress</small></div><div class="summary-card resolved"><div class="mono">' + String(s.resolved).padStart(2, "0") + '</div><small>Resolved</small></div></div><div class="desk-grid"><section class="panel"><div class="panel-head"><div><h2>' + (role === "student" ? "All help requests" : "Requests waiting on you") + '</h2><p>' + (role === "student" ? tickets.length + " conversations in your desk" : "Start at the top to keep response times fair.") + '</p></div><div class="search-wrap"><input class="search-input" id="ticket-search" placeholder="' + (role === "student" ? "Search requests" : "Search queue") + '" /></div></div><div class="ticket-list" id="ticket-list"></div></section><section class="panel detail-panel" id="detail-panel"></section></div></div></main></div></div>';
    var list = document.getElementById("ticket-list");
    function paintList() {
      var dbNow = getDb(), rows = ownedTickets(dbNow, session), query = (document.getElementById("ticket-search").value || "").toLowerCase();
      rows = rows.filter(function (ticket) { return (ticket.subject + " " + ticket.category + " " + ticket.student.fullName).toLowerCase().indexOf(query) > -1; });
      list.innerHTML = rows.length ? rows.map(function (ticket) { return ticketRow(ticket, ticket.id === selectedTicketId, role === "lecturer"); }).join("") : '<div class="empty-state" style="padding:55px 25px;text-align:center"><div class="empty-mark" style="margin:auto">+</div><h3>' + (role === "student" ? "No requests yet" : "Queue is clear") + '</h3><p>' + (role === "student" ? "Start a conversation when you need a next step." : "There are no tickets assigned to you right now.") + '</p></div>';
      list.querySelectorAll("[data-ticket]").forEach(function (row) { row.addEventListener("click", function () { selectedTicketId = row.getAttribute("data-ticket"); paintList(); paintDetail(); }); });
    }
    function paintDetail() {
      var panel = document.getElementById("detail-panel"), ticket = ticketById(getDb(), selectedTicketId);
      if (!ticket) { panel.className = "panel detail-panel empty"; panel.innerHTML = '<div class="empty-state"><div class="empty-mark ' + (role === "lecturer" ? "gold" : "") + '">' + (role === "lecturer" ? "✓" : "?") + '</div><h3>' + (role === "lecturer" ? "A thoughtful reply starts here" : "Select a request") + '</h3><p>' + (role === "lecturer" ? "Select a request to read the context and send the next useful step." : "Choose a conversation from the list to see its details and reply.") + '</p></div>'; return; }
      panel.className = "panel detail-panel"; panel.innerHTML = detailMarkup(ticket, role);
      bindDetail(ticket, role);
    }
    document.getElementById("ticket-search").addEventListener("input", paintList);
    document.getElementById("sign-out").addEventListener("click", function () { clearSession(); selectedTicketId = null; go("#home"); });
    document.getElementById("notification-button").addEventListener("click", function () { notifications = 0; this.classList.remove("has-badge"); });
    if (role === "student") document.getElementById("new-ticket").addEventListener("click", openNewTicket);
    paintList(); paintDetail();
  }
  function ticketRow(ticket, selected, queue) {
    return '<button class="ticket-row ' + (selected ? "selected" : "") + '" data-ticket="' + ticket.id + '"><div class="ticket-top"><span class="ticket-id">' + ticket.id + '</span>' + statusPill(ticket.status) + '</div><h3>' + escapeHtml(ticket.subject) + '</h3><p>' + (queue ? escapeHtml(ticket.student.fullName) + " · " + escapeHtml(ticket.student.department) : escapeHtml(ticket.lecturer.fullName)) + '</p><div class="ticket-meta"><span>' + escapeHtml(ticket.category) + '</span><span>·</span><span>' + formatDate(ticket.createdAt, true) + '</span></div></button>';
  }
  function detailMarkup(ticket, role) {
    var messages = ticket.messages.map(function (message) { return '<article class="message ' + (message.authorType === role ? "mine" : "") + '"><div class="message-author"><span>' + escapeHtml(message.authorName) + '</span><time>' + formatDate(message.createdAt, true) + '</time></div><p>' + escapeHtml(message.message) + '</p></article>'; }).join("");
    var info = role === "lecturer" ? '<div class="student-info"><span class="small-label">Student details</span><div class="student-info-grid"><div><span>Name</span><strong>' + escapeHtml(ticket.student.fullName) + '</strong></div><div><span>Matric number</span><strong>' + escapeHtml(ticket.student.matricNumber) + '</strong></div><div><span>Department</span><strong>' + escapeHtml(ticket.student.department) + '</strong></div><div><span>Submitted</span><strong>' + formatDate(ticket.createdAt, false) + '</strong></div></div></div>' : "";
    var actions = role === "student" ? '<div class="detail-actions"><div class="inline-actions">' + (ticket.status === "resolved" ? '<button class="btn btn-secondary btn-small" id="close-ticket">Close ticket</button>' : "") + (ticket.status === "closed" || ticket.status === "resolved" ? '<button class="btn btn-quiet btn-small" id="reopen-ticket">Reply and reopen</button>' : "") + '</div>' + (ticket.status === "closed" || ticket.status === "resolved" ? '<form id="student-reply-form" class="hidden"><textarea id="student-reply" placeholder="Tell the lecturer what still needs attention..." required></textarea><div class="actions-row"><span style="color:var(--muted);font-size:10px">Your reply will reopen this request.</span><button class="btn btn-primary btn-small" type="submit">Send reply</button></div></form>' : "") + '</div>' : '<div class="detail-actions"><form id="lecturer-response-form"><div class="actions-row"><div class="status-control"><label for="response-status">Status</label><select id="response-status"><option value="open" ' + (ticket.status === "open" ? "selected" : "") + '>Open</option><option value="in_progress" ' + (ticket.status === "in_progress" ? "selected" : "") + '>In progress</option><option value="resolved" ' + (ticket.status === "resolved" ? "selected" : "") + '>Resolved</option></select></div><span style="color:var(--muted-2);font-size:10px">' + formatDate(ticket.updatedAt, true) + '</span></div><textarea id="lecturer-response" placeholder="Write a clear, helpful response to the student..." required></textarea><div class="actions-row"><span style="color:var(--muted);font-size:10px">A response is sent instantly.</span><button class="btn btn-primary btn-small" type="submit">Send response</button></div></form></div>';
    return '<div class="detail-head"><div class="detail-head-row"><div><span class="ticket-id">' + ticket.id + '</span><h2>' + escapeHtml(ticket.subject) + '</h2><div class="detail-meta">' + escapeHtml(ticket.category) + ' · Routed to ' + escapeHtml(ticket.lecturer.fullName) + '</div></div>' + statusPill(ticket.status) + '</div></div><div class="conversation">' + messages + '</div>' + info + actions;
  }
  function bindDetail(ticket, role) {
    if (role === "student") {
      if (ticket.status === "in_progress" && ticket.messages[ticket.messages.length - 1].authorType === "lecturer") { ticket.status = "resolved"; var db = getDb(); saveDb(db); emitChange("Response viewed — ticket marked resolved"); }
      var close = document.getElementById("close-ticket");
      if (close) close.addEventListener("click", function () { var db = getDb(), current = ticketById(db, ticket.id); current.status = "closed"; current.updatedAt = isoDate(); saveDb(db); emitChange("Ticket archived"); pageDesk("student"); selectedTicketId = ticket.id; });
      var reopen = document.getElementById("reopen-ticket"), form = document.getElementById("student-reply-form");
      if (reopen) reopen.addEventListener("click", function () { form.classList.toggle("hidden"); if (!form.classList.contains("hidden")) document.getElementById("student-reply").focus(); });
      if (form) form.addEventListener("submit", function (event) { event.preventDefault(); var text = document.getElementById("student-reply").value.trim(); if (!text) return; var db = getDb(), current = ticketById(db, ticket.id), user = currentUser(db, getSession()); current.status = "open"; current.updatedAt = isoDate(); current.messages.push({ id: "msg-" + (++db.messageCounter), authorType: "student", authorName: user.fullName, message: text, createdAt: current.updatedAt }); saveDb(db); emitChange("Ticket reopened and lecturer notified"); pageDesk("student"); selectedTicketId = ticket.id; });
    } else {
      document.getElementById("lecturer-response-form").addEventListener("submit", function (event) { event.preventDefault(); var text = document.getElementById("lecturer-response").value.trim(); if (!text) return; var db = getDb(), current = ticketById(db, ticket.id), user = currentUser(db, getSession()); current.status = document.getElementById("response-status").value; current.updatedAt = isoDate(); current.messages.push({ id: "msg-" + (++db.messageCounter), authorType: "lecturer", authorName: user.fullName, message: text, createdAt: current.updatedAt }); saveDb(db); emitChange("Student notified of a new response"); pageDesk("lecturer"); selectedTicketId = ticket.id; });
    }
  }
  function openNewTicket() {
    var db = getDb();
    var backdrop = document.createElement("div"); backdrop.className = "modal-backdrop"; backdrop.innerHTML = '<section class="modal animate"><div class="modal-head"><div><div class="eyebrow">Start a conversation</div><h2>What can we help with?</h2></div><button class="close-modal" aria-label="Close">×</button></div><form class="modal-form" id="new-ticket-form"><div class="field"><label for="ticket-category">Issue category</label><select id="ticket-category"><option>Missing Grades</option><option>Timetable Clash</option><option>Assignment Issues</option><option>Academic advising</option><option>Fees and finance</option><option>Technology support</option><option>Wellbeing and access</option></select></div><div class="field"><label for="lecturer-search">Choose a lecturer</label><input id="lecturer-search" list="lecturer-list" required placeholder="Search by name or department" /><datalist id="lecturer-list">' + db.lecturers.map(function (lecturer) { return '<option value="' + escapeHtml(lecturer.fullName) + '">' + escapeHtml(lecturer.department) + '</option>'; }).join("") + '</datalist></div><div class="field"><label for="ticket-subject">Subject</label><input id="ticket-subject" required minlength="2" placeholder="Give your request a clear heading" /></div><div class="field"><label for="ticket-message">Message</label><textarea id="ticket-message" required minlength="5" placeholder="What have you tried, and what would a helpful next step look like?"></textarea></div><div class="form-actions"><button type="button" class="btn btn-quiet btn-small" id="cancel-ticket">Cancel</button><button type="submit" class="btn btn-primary btn-small">Send request</button></div></form></section></div>';
    document.body.appendChild(backdrop);
    var close = function () { backdrop.remove(); };
    backdrop.querySelector(".close-modal").addEventListener("click", close); backdrop.querySelector("#cancel-ticket").addEventListener("click", close);
    backdrop.querySelector("#new-ticket-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var name = document.getElementById("lecturer-search").value.trim(), lecturer = db.lecturers.find(function (item) { return item.fullName.toLowerCase() === name.toLowerCase() || (item.fullName + " · " + item.department).toLowerCase() === name.toLowerCase() || item.department.toLowerCase() === name.toLowerCase(); });
      if (!lecturer) return showToast("Choose a lecturer from the directory.");
      var user = currentUser(db, getSession()), timestamp = isoDate(), ticket = { id: "HD-" + db.ticketCounter++, category: document.getElementById("ticket-category").value, subject: document.getElementById("ticket-subject").value.trim(), message: document.getElementById("ticket-message").value.trim(), status: "open", createdAt: timestamp, updatedAt: timestamp, student: publicStudent(user), lecturer: publicLecturer(lecturer), messages: [{ id: "msg-" + (++db.messageCounter), authorType: "student", authorName: user.fullName, message: document.getElementById("ticket-message").value.trim(), createdAt: timestamp }] };
      db.tickets.push(ticket); saveDb(db); close(); selectedTicketId = ticket.id; emitChange("New request routed to " + lecturer.fullName); pageDesk("student");
    });
  }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, function (character) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]; }); }
  function route() {
    seedDb();
    var hash = (window.location.hash || "#home").slice(1);
    if (hash === "student" || hash === "lecturer") return pageDesk(hash);
     if (hash === "student-login" || hash === "lecturer-login" || hash === "register" || hash === "staff-register") return pageAuth(hash);
    pageHome();
  }
  function refreshForEvent() {
    var session = getSession(); if (!session) return;
    notifications += 1;
    if (window.location.hash === "#student" || window.location.hash === "#lecturer") route();
  }
  window.addEventListener("hashchange", route);
  window.addEventListener("storage", function (event) { if (event.key === EVENT_KEY) refreshForEvent(); });
  if ("BroadcastChannel" in window) { channel = new BroadcastChannel("common-room-helpdesk"); channel.addEventListener("message", refreshForEvent); }
  route();
})();