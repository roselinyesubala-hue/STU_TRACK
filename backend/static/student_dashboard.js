// student_dashboard.js
// Complete client-side behavior for student_dashboard.html
// - Panel switching
// - Sidebar mobile toggle
// - Active link highlighting
// - Lightweight dynamic loaders (notices, attendance) if API endpoints exist
// - Safe DOM-ready initialization

(function () {
  "use strict";

  /* -------------------------
     Utility helpers
  -------------------------*/
  function qs(selector, root = document) {
    return root.querySelector(selector);
  }
  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  /* -------------------------
     Panel switching
     - Hides all .panel elements and shows the one with id=panelId
  -------------------------*/
  function showPanel(panelId) {
    const panels = qsa(".panel");
    panels.forEach((p) => p.classList.add("hidden"));

    const target = document.getElementById(panelId);
    if (target) {
      target.classList.remove("hidden");
      // update URL hash without scrolling
      if (history && history.replaceState) {
        history.replaceState(null, "", "#" + panelId);
      } else {
        location.hash = panelId;
      }
    }
    setActiveLink(panelId);
  }

  /* -------------------------
     Active link highlighting
  -------------------------*/
  function setActiveLink(panelId) {
    const links = qsa(".sidebar-nav a");
    links.forEach((a) => {
      // links use onclick handlers with return false; or href="#id"
      const href = a.getAttribute("href") || "";
      const targetId = href.startsWith("#") ? href.slice(1) : a.dataset.target;
      if (targetId === panelId) {
        a.classList.add("active");
      } else {
        a.classList.remove("active");
      }
    });
  }

  /* -------------------------
     Sidebar mobile toggle
  -------------------------*/
  function initSidebarToggle() {
    // create a small toggle button for narrow screens
    const toggle = document.createElement("button");
    toggle.className = "sidebar-toggle";
    toggle.type = "button";
    toggle.innerText = "☰";
    toggle.setAttribute("aria-label", "Toggle navigation");
    document.body.insertBefore(toggle, document.body.firstChild);

    const sidebar = qs(".sidebar");
    toggle.addEventListener("click", function () {
      if (!sidebar) return;
      sidebar.classList.toggle("collapsed");
    });

    // close sidebar when clicking outside on small screens
    document.addEventListener("click", (e) => {
      if (!sidebar) return;
      if (window.innerWidth > 900) return; // only for small screens
      if (sidebar.contains(e.target) || toggle.contains(e.target)) return;
      sidebar.classList.add("collapsed");
    });
  }

  /* -------------------------
     Attach sidebar link handlers
     - Links in HTML call showPanel via onclick; this ensures keyboard accessibility too
  -------------------------*/
  function initSidebarLinks() {
    const links = qsa(".sidebar-nav a");
    links.forEach((a) => {
      // If link already has inline onclick, keep it; still attach for keyboard
      a.addEventListener("click", function (ev) {
        const href = a.getAttribute("href") || "";
        const panelId = href.startsWith("#") ? href.slice(1) : a.dataset.target;
        if (panelId) {
          ev.preventDefault();
          showPanel(panelId);
        }
      });
    });
  }

  /* -------------------------
     Lightweight dynamic loaders (optional)
     - These try to fetch JSON from endpoints if available.
     - They fail silently (console.warn) if endpoints don't exist.
  -------------------------*/
  function loadNotices() {
    const container = qs("#notice .notice-cards");
    if (!container) return;
    fetch("/student/api/notices")
      .then((r) => {
        if (!r.ok) throw new Error("No notices API");
        return r.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) return;
        container.innerHTML = data.length
          ? data
            .map(
              (n) =>
                `<div class="notice-card">
                    <div class="notice-header">
                      <h3 class="notice-title">${escapeHtml(n.title)}</h3>
                    </div>
                    <div class="notice-body">
                      ${escapeHtml(n.description || n.content || "")}
                    </div>
                    <div class="notice-footer">
                      <span class="notice-date">Posted on: ${escapeHtml(n.posted_on || "")}</span>
                    </div>
                  </div>`
            )
            .join("")
          : "<p>No notices available</p>";
      })
      .catch((err) => {
        // not critical; keep server-rendered content if present
        console.warn("loadNotices:", err.message);
      });
  }

  function loadAttendance() {
    const tableBody = qs("#attendance tbody");
    if (!tableBody) return;
    fetch("/student/api/attendance")
      .then((r) => {
        if (!r.ok) throw new Error("No attendance API");
        return r.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) return;
        tableBody.innerHTML = data.length
          ? data
            .map(
              (rec) => {
                const badgeClass = rec.status === 'Present' ? 'bg-success' : 'bg-danger';
                return `<tr>
                  <td>${escapeHtml(rec.date)}</td>
                  <td>${escapeHtml(rec.time)}</td>
                  <td><span class="badge ${badgeClass}">${escapeHtml(rec.status)}</span></td>
                </tr>`;
              }
            )
            .join("")
          : `<tr><td colspan="3">No attendance records found</td></tr>`;
      })
      .catch((err) => {
        console.warn("loadAttendance:", err.message);
      });
  }

  /* -------------------------
     Small helper: escape HTML for inserted strings
  -------------------------*/
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* -------------------------
     Form enhancement (AJAX Submission)
     - Submit forms via AJAX to retain data on validation errors
  -------------------------*/
  function initForms() {
    const forms = qsa(".form");
    forms.forEach((form) => {
      form.addEventListener("submit", function (ev) {
        if (ev.defaultPrevented) return; // Respect inline onsubmit cancel
        ev.preventDefault(); // Stop normal submission

        const btn = form.querySelector("button[type='submit']");
        const originalText = btn ? btn.textContent : "Submit";
        
        if (btn) {
          btn.disabled = true;
          btn.classList.add("disabled");
          btn.textContent = "Submitting...";
        }

        const formData = new FormData(form);

        fetch(form.action, {
          method: form.method || 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: formData
        })
        .then(response => {
           return response.json().then(data => ({ status: response.status, data }));
        })
        .then(({ status, data }) => {
           if (btn) {
             btn.disabled = false;
             btn.classList.remove("disabled");
             btn.textContent = originalText;
           }
           
           if (!data.success) {
             if (data.errors) {
               let firstField = null;
               for (const [fieldName, errorMsg] of Object.entries(data.errors)) {
                 const input = form.querySelector(`[name="${fieldName}"]`);
                 if (input) {
                   input.setCustomValidity(errorMsg);
                   if (!firstField) firstField = input;
                   // Clear the error when the user modifies the input again
                   input.addEventListener('input', function clearValidity() {
                     input.setCustomValidity('');
                     input.removeEventListener('input', clearValidity);
                   });
                 }
               }
               if (firstField) {
                 firstField.reportValidity(); // This triggers the native browser error pointing to the field
               } else {
                 alert("Error: Invalid input.");
               }
             } else {
               alert("Error: " + (data.message || "Invalid input."));
             }
           } else {
             alert(data.message || "Successfully submitted!");
             form.reset(); // clear form only on success
             // The dashboard will auto-update via polling shortly!
           }
        })
        .catch(error => {
           console.error('Error submitting form:', error);
           if (btn) {
             btn.disabled = false;
             btn.classList.remove("disabled");
             btn.textContent = originalText;
           }
           alert("A network error occurred or you have been logged out.");
        });
      });
    });
  }

  /* -------------------------
     Initialization on DOMContentLoaded
  -------------------------*/
  document.addEventListener("DOMContentLoaded", function () {
    initSidebarToggle();
    initSidebarLinks();
    initForms();

    // Show panel based on hash or default to profile
    const initial = (location.hash && location.hash.slice(1)) || "profile";
    showPanel(initial);

    // Try to load dynamic content (non-blocking)
    loadNotices();
    loadAttendance();
    startPolling();
  });

  /* -------------------------
     Background Polling function
  -------------------------*/
  function startPolling() {
    setInterval(() => {
      // Fetch latest dashboard HTML
      fetch(window.location.pathname + "?polling=1", {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
        .then(response => {
          if (!response.ok) throw new Error("Network response was not ok");
          return response.text();
        })
        .then(html => {
          // Parse the returned HTML string into a document
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');

          // Helper function to safely replace tbody/content
          const updateTbody = (selector) => {
            const currentTbody = qs(selector);
            const newTbody = doc.querySelector(selector);
            if (currentTbody && newTbody) {
              currentTbody.innerHTML = newTbody.innerHTML;
            }
          };

          // Outpass History (usually the second table in the Outpass panel)
          const outpassTables = qsa('#outpass table tbody');
          const newOutpassTables = Array.from(doc.querySelectorAll('#outpass table tbody'));
          if (outpassTables.length >= 1 && newOutpassTables.length >= 1) {
            outpassTables[outpassTables.length - 1].innerHTML = newOutpassTables[newOutpassTables.length - 1].innerHTML;
          }

          // Leave History
          const leaveTables = qsa('#leave table tbody');
          const newLeaveTables = Array.from(doc.querySelectorAll('#leave table tbody'));
          if (leaveTables.length >= 1 && newLeaveTables.length >= 1) {
            leaveTables[leaveTables.length - 1].innerHTML = newLeaveTables[newLeaveTables.length - 1].innerHTML;
          }

          // Reports History
          const reportTables = qsa('#reports table tbody');
          const newReportTables = Array.from(doc.querySelectorAll('#reports table tbody'));
          if (reportTables.length >= 1 && newReportTables.length >= 1) {
            reportTables[reportTables.length - 1].innerHTML = newReportTables[newReportTables.length - 1].innerHTML;
          }

          // Dynamic API loaders can also be re-triggered safely
          loadNotices();
          loadAttendance();
        })
        .catch(err => console.error("Polling error:", err));
    }, 3000); // Poll every 3 seconds
  }

  /* -------------------------
     Expose showPanel for inline onclick handlers (if used)
  -------------------------*/
  window.showPanel = showPanel;
})();

// Student attendance date filter
document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('studentAttendanceSearch');
  if (searchInput) {
    searchInput.addEventListener('keyup', function () {
      const filter = this.value.toLowerCase();
      const rows = document.querySelectorAll('#studentAttendanceTable tbody tr');
      rows.forEach(row => {
        if (row.cells.length >= 1) {
          const date = row.cells[0].textContent.toLowerCase();
          row.style.display = date.includes(filter) ? '' : 'none';
        }
      });
    });
  }
});

// Outpass Generation Logic
let outpassTimerInterval = null;

function generateOutpass(outpassId, btnElement) {
  // Disable button immediately to prevent double clicks
  btnElement.disabled = true;
  const originalText = btnElement.innerText;
  btnElement.innerText = "Loading...";

  fetch(`/student/api/outpass/generate/${outpassId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // populate the slip
        document.getElementById('slip-outpass-id').innerText = data.outpass.outpass_id;
        document.getElementById('slip-date').innerText = escapeHtml(data.outpass.date);
        document.getElementById('slip-name').innerText = escapeHtml(data.outpass.name);
        document.getElementById('slip-room').innerText = escapeHtml(data.outpass.room);
        document.getElementById('slip-place').innerText = escapeHtml(data.outpass.place);
        document.getElementById('slip-return-date').innerText = escapeHtml(data.outpass.return_date);
        document.getElementById('slip-return-time').innerText = escapeHtml(data.outpass.return_time);

        // show modal
        document.getElementById('outpassModal').classList.remove('hidden');

        // Start countdown
        startOutpassCountdown(data.remaining_seconds, btnElement, originalText);
      } else {
        alert(data.message || 'Error generating outpass');
        if (data.message === "Slip has expired.") {
          btnElement.innerText = "Slip Expired";
          btnElement.style.backgroundColor = "#a0aec0";
          btnElement.disabled = true;
        } else {
          btnElement.innerText = originalText;
          btnElement.disabled = false;
        }
      }
    })
    .catch(err => {
      console.error(err);
      alert('Failed to connect to server.');
      btnElement.innerText = originalText;
      btnElement.disabled = false;
    });
}

function closeOutpassModal() {
  document.getElementById('outpassModal').classList.add('hidden');
}

function startOutpassCountdown(seconds, btnElement, defaultText) {
  if (outpassTimerInterval) clearInterval(outpassTimerInterval);

  let remaining = seconds;
  const timerDisplay = document.getElementById('countdown-timer');
  btnElement.disabled = false; // Enable to view again

  const updateTimer = () => {
    if (remaining <= 0) {
      clearInterval(outpassTimerInterval);
      timerDisplay.innerText = "Slip Expired!";
      btnElement.innerText = "Slip Expired";
      btnElement.disabled = true;
      btnElement.style.backgroundColor = "#a0aec0";
      // close modal if open
      setTimeout(closeOutpassModal, 2000);
      return;
    }

    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    const timeStr = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    timerDisplay.innerText = `Valid for: ${timeStr} before expiration.`;

    // update button text as well
    btnElement.innerText = `View Slip (${timeStr})`;

    remaining--;
  };

  updateTimer();
  outpassTimerInterval = setInterval(updateTimer, 1000);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}