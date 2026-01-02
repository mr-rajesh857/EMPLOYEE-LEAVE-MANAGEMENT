let socket = null

// Initialize Socket.IO connection
function initializeSocket() {
  if (window.io) {
    socket = window.io()
    return true
  }
  console.error("[v0] Socket.IO not available")
  return false
}

let userProfile = null
let currentMonth = new Date().getMonth()
let currentYear = new Date().getFullYear()
let allLeaves = []

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  console.log("[v0] Employee dashboard initializing...")
  initializeSocket()
  loadUserProfile()
  setupNavigation()
  setupLeaveForm()
  setupSocketListeners()

  // Set minimum date for leave requests
  const today = new Date().toISOString().split("T")[0]
  document.getElementById("start-date").min = today
  document.getElementById("end-date").min = today
})

// Socket.IO event listeners
function setupSocketListeners() {
  if (!socket) {
    console.log("[v0] Socket not initialized, skipping listeners")
    return
  }

  socket.on("connected", (data) => {
    console.log("[v0] Socket connected:", data.message)
  })

  socket.on("leave_status_update", (data) => {
    console.log("[v0] Leave status updated:", data)
    showNotification(`Your leave request has been ${data.status}`, data.status === "approved" ? "success" : "error")
    loadMyRequests()
    loadUserProfile()
  })
}

// Load user profile
async function loadUserProfile() {
  console.log("[v0] Loading user profile...")
  try {
    const response = await fetch("/api/user/profile")
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    console.log("[v0] User profile loaded:", data)
    userProfile = data

    document.getElementById("user-name-display").textContent = data.name
    document.getElementById("vacation-balance").textContent = data.vacation_balance
    document.getElementById("sick-balance").textContent = data.sick_balance

    // Load recent requests for overview
    loadRecentRequests()
  } catch (error) {
    console.error("[v0] Error loading profile:", error)
    showNotification("Error loading profile. Please refresh the page.", "error")
  }
}

// Navigation
function setupNavigation() {
  console.log("[v0] Setting up navigation...")
  const navItems = document.querySelectorAll(".nav-item")

  navItems.forEach((item) => {
    item.addEventListener("click", function () {
      const tabName = this.dataset.tab
      console.log("[v0] Switching to tab:", tabName)

      // Update active nav item
      navItems.forEach((nav) => nav.classList.remove("active"))
      this.classList.add("active")

      // Show corresponding tab
      document.querySelectorAll(".tab-content").forEach((tab) => {
        tab.classList.remove("active")
      })
      document.getElementById(`${tabName}-tab`).classList.add("active")

      // Load data for specific tabs
      if (tabName === "my-requests") {
        loadMyRequests()
      } else if (tabName === "calendar") {
        loadCalendar()
      }
    })
  })
}

// Load recent requests for overview
async function loadRecentRequests() {
  console.log("[v0] Loading recent requests...")
  try {
    const response = await fetch("/api/leaves/my-requests")
    const requests = await response.json()
    console.log("[v0] Recent requests loaded:", requests.length)

    const pendingCount = requests.filter((r) => r.status === "pending").length
    document.getElementById("pending-count").textContent = pendingCount

    const recentList = document.getElementById("recent-requests-list")
    const recentRequests = requests.slice(0, 3)

    if (recentRequests.length === 0) {
      recentList.innerHTML =
        '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">No leave requests yet</p>'
      return
    }

    recentList.innerHTML = recentRequests.map((request) => createRequestCard(request)).join("")
  } catch (error) {
    console.error("[v0] Error loading recent requests:", error)
  }
}

// Load my requests
async function loadMyRequests() {
  console.log("[v0] Loading my requests...")
  try {
    const response = await fetch("/api/leaves/my-requests")
    const requests = await response.json()
    console.log("[v0] My requests loaded:", requests.length)

    const requestsList = document.getElementById("my-requests-list")

    if (requests.length === 0) {
      requestsList.innerHTML =
        '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">No leave requests yet</p>'
      return
    }

    requestsList.innerHTML = requests.map((request) => createRequestCard(request)).join("")
  } catch (error) {
    console.error("[v0] Error loading requests:", error)
  }
}

// Create request card
function createRequestCard(request) {
  return `
        <div class="request-card">
            <div class="request-header">
                <div class="request-user">${request.leave_type.charAt(0).toUpperCase() + request.leave_type.slice(1)} Leave</div>
                <span class="request-status ${request.status}">${request.status}</span>
            </div>
            <div class="request-info">
                <div class="info-item">
                    <span class="info-label">Start Date</span>
                    <span class="info-value">${formatDate(request.start_date)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">End Date</span>
                    <span class="info-value">${formatDate(request.end_date)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Submitted</span>
                    <span class="info-value">${formatDateTime(request.submitted_at)}</span>
                </div>
            </div>
            <div class="request-reason">
                <strong>Reason:</strong> ${request.reason}
            </div>
            ${
              request.manager_comment
                ? `
                <div class="request-reason" style="margin-top: 8px;">
                    <strong>Manager Comment:</strong> ${request.manager_comment}
                </div>
            `
                : ""
            }
        </div>
    `
}

// Leave form submission
function setupLeaveForm() {
  console.log("[v0] Setting up leave form...")
  const leaveForm = document.getElementById("leave-form")

  leaveForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    console.log("[v0] Submitting leave form...")

    const formData = {
      leave_type: document.getElementById("leave-type").value,
      start_date: document.getElementById("start-date").value,
      end_date: document.getElementById("end-date").value,
      reason: document.getElementById("reason").value,
    }

    console.log("[v0] Form data:", formData)

    try {
      const response = await fetch("/api/leaves/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      console.log("[v0] Form submission response:", data)

      if (data.success) {
        showFormMessage("Leave request submitted successfully!", "success")
        leaveForm.reset()

        // Reload overview data
        setTimeout(() => {
          loadUserProfile()
        }, 1000)
      } else {
        showFormMessage("Failed to submit leave request", "error")
      }
    } catch (error) {
      console.error("[v0] Error submitting leave:", error)
      showFormMessage("An error occurred", "error")
    }
  })
}

async function loadCalendar() {
  console.log("[v0] Loading calendar...")
  try {
    const response = await fetch("/api/calendar/leaves")
    allLeaves = await response.json()
    console.log("[v0] Calendar events loaded:", allLeaves.length)

    setupCalendarControls()
    renderCalendar()
  } catch (error) {
    console.error("[v0] Error loading calendar:", error)
  }
}

function setupCalendarControls() {
  const prevBtn = document.getElementById("prev-month")
  const nextBtn = document.getElementById("next-month")

  if (prevBtn && nextBtn) {
    prevBtn.onclick = () => {
      currentMonth--
      if (currentMonth < 0) {
        currentMonth = 11
        currentYear--
      }
      renderCalendar()
    }

    nextBtn.onclick = () => {
      currentMonth++
      if (currentMonth > 11) {
        currentMonth = 0
        currentYear++
      }
      renderCalendar()
    }
  }
}

function renderCalendar() {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  // Update month/year display
  document.getElementById("current-month-year").textContent = `${monthNames[currentMonth]} ${currentYear}`

  // Get calendar data
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

  const today = new Date()
  const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear

  // Build calendar grid
  let calendarHTML = '<div class="calendar-weekdays">'
  weekdays.forEach((day) => {
    calendarHTML += `<div class="calendar-weekday">${day}</div>`
  })
  calendarHTML += '</div><div class="calendar-days">'

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    calendarHTML += `<div class="calendar-day other-month">
      <div class="calendar-day-number">${day}</div>
    </div>`
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const isToday = isCurrentMonth && day === today.getDate()
    const dayLeaves = getLeavesForDate(dateStr)

    calendarHTML += `<div class="calendar-day ${isToday ? "today" : ""}">
      <div class="calendar-day-number">${day}</div>
      ${dayLeaves
        .map(
          (leave) => `
        <div class="calendar-leave-indicator ${leave.type}" title="${leave.title}">
          ${leave.user_name}
        </div>
      `,
        )
        .join("")}
      ${dayLeaves.length > 2 ? `<div class="calendar-leave-count">+${dayLeaves.length - 2} more</div>` : ""}
    </div>`
  }

  // Next month days
  const remainingCells = 42 - (firstDay + daysInMonth)
  for (let day = 1; day <= remainingCells; day++) {
    calendarHTML += `<div class="calendar-day other-month">
      <div class="calendar-day-number">${day}</div>
    </div>`
  }

  calendarHTML += "</div>"
  document.getElementById("calendar-grid").innerHTML = calendarHTML

  // Render leave list for current month
  renderLeaveList()
}

function getLeavesForDate(dateStr) {
  return allLeaves
    .filter((leave) => {
      const leaveStart = new Date(leave.start)
      const leaveEnd = new Date(leave.end)
      const checkDate = new Date(dateStr)
      return checkDate >= leaveStart && checkDate <= leaveEnd
    })
    .map((leave) => ({
      ...leave,
      user_name: leave.title.split(" - ")[0],
    }))
}

function renderLeaveList() {
  const monthLeaves = allLeaves.filter((leave) => {
    const leaveDate = new Date(leave.start)
    return leaveDate.getMonth() === currentMonth && leaveDate.getFullYear() === currentYear
  })

  const leaveListContainer = document.getElementById("calendar-leave-list")

  if (monthLeaves.length === 0) {
    leaveListContainer.innerHTML = '<div class="empty-calendar">No leaves scheduled for this month</div>'
    return
  }

  let listHTML = "<h4>Leave Schedule</h4>"
  monthLeaves.forEach((leave) => {
    const initials = leave.title
      .split(" - ")[0]
      .split(" ")
      .map((n) => n[0])
      .join("")
    listHTML += `
      <div class="calendar-leave-item ${leave.type}">
        <div class="calendar-leave-avatar">${initials}</div>
        <div class="calendar-leave-details">
          <div class="calendar-leave-name">${leave.title.split(" - ")[0]}</div>
          <div class="calendar-leave-dates">${formatDate(leave.start)} - ${formatDate(leave.end)}</div>
        </div>
        <span class="calendar-leave-type ${leave.type}">${leave.type}</span>
      </div>
    `
  })

  leaveListContainer.innerHTML = listHTML
}

// Utility functions
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

function formatDateTime(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function showFormMessage(message, type) {
  const formMessage = document.getElementById("form-message")
  formMessage.textContent = message
  formMessage.className = `form-message ${type}`

  setTimeout(() => {
    formMessage.classList.remove(type)
  }, 5000)
}

function showNotification(message, type = "info") {
  const toast = document.getElementById("notification-toast")
  toast.textContent = message
  toast.className = `notification-toast ${type} show`

  setTimeout(() => {
    toast.classList.remove("show")
  }, 4000)
}
