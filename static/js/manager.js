// Import Socket.IO
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

let currentLeaveId = null
let currentMonth = new Date().getMonth()
let currentYear = new Date().getFullYear()
let allLeaves = []

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  console.log("[v0] Manager dashboard initializing...")
  initializeSocket()
  loadUserProfile()
  setupNavigation()
  loadPendingRequests()
  setupSocketListeners()
  setupFilters()
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

  socket.on("new_leave_request", (data) => {
    console.log("[v0] New leave request received:", data)
    showNotification(`New leave request from ${data.user_name}`, "info")
    loadPendingRequests()
    updateNotificationBadge()
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
    document.getElementById("user-name-display").textContent = data.name
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
      if (tabName === "pending") {
        loadPendingRequests()
      } else if (tabName === "all-requests") {
        loadAllRequests()
      } else if (tabName === "calendar") {
        loadCalendar()
      }
    })
  })
}

// Load pending requests
async function loadPendingRequests() {
  console.log("[v0] Loading pending requests...")
  try {
    const response = await fetch("/api/leaves/pending")
    const requests = await response.json()
    console.log("[v0] Pending requests loaded:", requests.length)

    const badge = document.getElementById("pending-badge")
    badge.textContent = requests.length

    updateNotificationBadge(requests.length)

    const requestsList = document.getElementById("pending-requests-list")

    if (requests.length === 0) {
      requestsList.innerHTML =
        '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">No pending requests</p>'
      return
    }

    requestsList.innerHTML = requests.map((request) => createManagerRequestCard(request)).join("")
  } catch (error) {
    console.error("[v0] Error loading pending requests:", error)
  }
}

// Load all requests
async function loadAllRequests(statusFilter = "all") {
  console.log("[v0] Loading all requests with filter:", statusFilter)
  try {
    const response = await fetch("/api/leaves/all")
    let requests = await response.json()
    console.log("[v0] All requests loaded:", requests.length)

    if (statusFilter !== "all") {
      requests = requests.filter((r) => r.status === statusFilter)
    }

    const requestsList = document.getElementById("all-requests-list")

    if (requests.length === 0) {
      requestsList.innerHTML =
        '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">No requests found</p>'
      return
    }

    requestsList.innerHTML = requests.map((request) => createManagerRequestCard(request)).join("")
  } catch (error) {
    console.error("[v0] Error loading all requests:", error)
  }
}

// Create manager request card
function createManagerRequestCard(request) {
  const isPending = request.status === "pending"

  return `
        <div class="request-card">
            <div class="request-header">
                <div class="request-user">${request.user_name}</div>
                <span class="request-status ${request.status}">${request.status}</span>
            </div>
            <div class="request-info">
                <div class="info-item">
                    <span class="info-label">Leave Type</span>
                    <span class="info-value">${request.leave_type.charAt(0).toUpperCase() + request.leave_type.slice(1)}</span>
                </div>
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
                    <strong>Comment:</strong> ${request.manager_comment}
                </div>
            `
                : ""
            }
            ${
              isPending
                ? `
                <div class="request-actions">
                    <button class="btn btn-sm btn-primary" onclick="openApprovalModal('${request._id}')">Review</button>
                </div>
            `
                : ""
            }
        </div>
    `
}

// Open approval modal
function openApprovalModal(leaveId) {
  currentLeaveId = leaveId

  // Fetch leave details
  fetch(`/api/leaves/all`)
    .then((response) => response.json())
    .then((requests) => {
      const leave = requests.find((r) => r._id === leaveId)
      if (leave) {
        const modalDetails = document.getElementById("modal-details")
        modalDetails.innerHTML = `
                    <div style="margin-bottom: 20px;">
                        <div style="margin-bottom: 12px;">
                            <strong>Employee:</strong> ${leave.user_name}
                        </div>
                        <div style="margin-bottom: 12px;">
                            <strong>Leave Type:</strong> ${leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)}
                        </div>
                        <div style="margin-bottom: 12px;">
                            <strong>Duration:</strong> ${formatDate(leave.start_date)} - ${formatDate(leave.end_date)}
                        </div>
                        <div style="margin-bottom: 12px;">
                            <strong>Reason:</strong> ${leave.reason}
                        </div>
                    </div>
                `

        document.getElementById("approval-modal").classList.add("show")
      }
    })
}

// Close approval modal
function closeApprovalModal() {
  document.getElementById("approval-modal").classList.remove("show")
  document.getElementById("manager-comment").value = ""
  currentLeaveId = null
}

// Approve leave
async function approveLeave() {
  if (!currentLeaveId) return

  const comment = document.getElementById("manager-comment").value
  console.log("[v0] Approving leave:", currentLeaveId)

  try {
    const response = await fetch(`/api/leaves/${currentLeaveId}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment }),
    })

    const data = await response.json()

    if (data.success) {
      showNotification("Leave request approved", "success")
      closeApprovalModal()
      loadPendingRequests()
    } else {
      showNotification("Failed to approve leave", "error")
    }
  } catch (error) {
    console.error("[v0] Error approving leave:", error)
    showNotification("An error occurred", "error")
  }
}

// Reject leave
async function rejectLeave() {
  if (!currentLeaveId) return

  const comment = document.getElementById("manager-comment").value

  if (!comment) {
    alert("Please provide a reason for rejection")
    return
  }

  console.log("[v0] Rejecting leave:", currentLeaveId)

  try {
    const response = await fetch(`/api/leaves/${currentLeaveId}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment }),
    })

    const data = await response.json()

    if (data.success) {
      showNotification("Leave request rejected", "success")
      closeApprovalModal()
      loadPendingRequests()
    } else {
      showNotification("Failed to reject leave", "error")
    }
  } catch (error) {
    console.error("[v0] Error rejecting leave:", error)
    showNotification("An error occurred", "error")
  }
}

// Setup filters
function setupFilters() {
  const statusFilter = document.getElementById("status-filter")
  statusFilter.addEventListener("change", function () {
    loadAllRequests(this.value)
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
        .slice(0, 2)
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

// Update notification badge
function updateNotificationBadge(count) {
  const badge = document.getElementById("notification-count")
  if (count > 0) {
    badge.textContent = count
    badge.style.display = "block"
  } else {
    badge.style.display = "none"
  }
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

function showNotification(message, type = "info") {
  const toast = document.getElementById("notification-toast")
  toast.textContent = message
  toast.className = `notification-toast ${type} show`

  setTimeout(() => {
    toast.classList.remove("show")
  }, 4000)
}

window.openApprovalModal = openApprovalModal
window.closeApprovalModal = closeApprovalModal
window.approveLeave = approveLeave
window.rejectLeave = rejectLeave
