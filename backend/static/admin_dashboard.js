// admin_dashboard.js
// Modern, robust client-side behavior for admin_dashboard.html
// Unified with student_dashboard.js architecture

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
    try {
      const panels = qsa(".panel");
      panels.forEach((p) => {
        p.classList.remove("active");
        p.classList.add("hidden");
        p.style.display = "none";
      });

      const target = document.getElementById(panelId);
      if (target) {
        target.classList.remove("hidden");
        target.classList.add("active");
        target.style.display = "block";

        // update URL hash without scrolling
        if (window.history && typeof window.history.replaceState === 'function') {
          window.history.replaceState(null, "", "#" + panelId);
        } else {
          window.location.hash = panelId;
        }
      }
      setActiveLink(panelId);
    } catch (err) {
      console.error("Error in showPanel:", err);
    }
  }

  /* -------------------------
     Active link highlighting
  -------------------------*/
  function setActiveLink(panelId) {
    const links = qsa(".sidebar nav a");
    links.forEach((a) => {
      const href = a.getAttribute("href") || "";
      const onclick = a.getAttribute("onclick") || "";
      const targetId = href.startsWith("#") ? href.slice(1) : "";

      if (targetId === panelId || onclick.indexOf(panelId) !== -1) {
        a.classList.add("active");
      } else {
        a.classList.remove("active");
      }
    });
  }

  /* -------------------------
     Initialization on DOMContentLoaded
  -------------------------*/
  document.addEventListener("DOMContentLoaded", function () {
    // Show panel based on hash or default to add-student
    const initial = (location.hash && location.hash.slice(1)) || "add-student";
    showPanel(initial);

    initStudentSearch();
    initAttendanceQuickToggle();
    initAddStudentForm();
    startPolling();
  });

  function initStudentSearch() {
    const searchInput = document.getElementById('studentSearch');
    if (searchInput) {
      searchInput.addEventListener('keyup', function () {
        const filter = this.value.toLowerCase();
        qsa('#studentTable tbody tr').forEach(row => {
          const id = row.cells[0].textContent.toLowerCase();
          const name = row.cells[1].textContent.toLowerCase();
          row.style.display = (id.includes(filter) || name.includes(filter)) ? '' : 'none';
        });
      });
    }
  }

  function initAttendanceQuickToggle() {
    const attendanceRows = qsa("#attendance tbody tr");
    attendanceRows.forEach(row => {
      const radios = qsa("input[type='radio']", row);
      radios.forEach(radio => {
        radio.addEventListener("change", () => {
          row.style.backgroundColor = radio.value === "Present" ? "#e8f8e8" : "#fbeaea";
        });
      });
    });
  }

  function initAddStudentForm() {
    const form = document.getElementById('addStudentForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const submitBtn = qs('button[type="submit"]', form);
      if (submitBtn.disabled) return; // Prevent double submission

      // Clear previous specific errors
      qsa('.invalid-feedback', form).forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
      });

      if (!form.checkValidity()) {
        let firstInvalid = null;
        // Find which fields are invalid
        qsa('input, textarea, select', form).forEach(input => {
          if (!input.validity.valid) {
            if (!firstInvalid) firstInvalid = input;
            const feedback = input.parentElement.querySelector('.invalid-feedback');
            if (feedback) {
              feedback.textContent = "This field is required.";
              feedback.style.display = 'block';
            }
          }
        });
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Saving...';
      submitBtn.disabled = true;

      const formData = new FormData(form);

      fetch(form.action, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData
      })
        .then(response => {
          if (!response.ok && response.status !== 400) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(data => {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;

          if (!data.success) {
            if (data.errors) {
              let firstErrorField = null;
              // Show field-specific errors
              for (const [field, errorMsg] of Object.entries(data.errors)) {
                const input = form.querySelector(`[name="${field}"]`);
                if (input) {
                  if (!firstErrorField) firstErrorField = input;
                  const feedback = input.parentElement.querySelector('.invalid-feedback');
                  if (feedback) {
                    feedback.textContent = errorMsg;
                    feedback.style.display = 'block';
                  }
                }
              }
              if (firstErrorField) firstErrorField.focus();
            } else if (data.message) {
              // Fallback generic error
              alert(data.message);
            }
          } else {
            // Success
            alert(data.message || 'Student added successfully!');
            form.reset();
          }
        })
        .catch(error => {
          console.error('Error:', error);
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
          alert('An error occurred while saving. Please try again.');
        });
    });
  }

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

          // Helper function to safely replace tbody content
          const updateTbody = (selector) => {
            const currentTbody = qs(selector);
            const newTbody = doc.querySelector(selector);
            if (currentTbody && newTbody) {
              currentTbody.innerHTML = newTbody.innerHTML;
            }
          };

          // Update the different Data Tables

          // Student List
          updateTbody('#studentTable tbody');

          // Airwing Personnel List
          updateTbody('#airwing table tbody');

          // Outpass Pending and History
          const outpassTables = qsa('#outpass table tbody');
          const newOutpassTables = Array.from(doc.querySelectorAll('#outpass table tbody'));
          if (outpassTables.length >= 2 && newOutpassTables.length >= 2) {
            outpassTables[0].innerHTML = newOutpassTables[0].innerHTML;
            outpassTables[1].innerHTML = newOutpassTables[1].innerHTML;
          }

          // Leave Pending and History
          const leaveTables = qsa('#leave table tbody');
          const newLeaveTables = Array.from(doc.querySelectorAll('#leave table tbody'));
          if (leaveTables.length >= 2 && newLeaveTables.length >= 2) {
            leaveTables[0].innerHTML = newLeaveTables[0].innerHTML;
            leaveTables[1].innerHTML = newLeaveTables[1].innerHTML;
          }

          // Reports Panel
          const reportTables = qsa('#reports table tbody');
          const newReportTables = Array.from(doc.querySelectorAll('#reports table tbody'));
          if (reportTables.length >= 2 && newReportTables.length >= 2) {
            reportTables[0].innerHTML = newReportTables[0].innerHTML;
            reportTables[1].innerHTML = newReportTables[1].innerHTML;
          }

        })
        .catch(err => console.error("Polling error:", err));
    }, 3000); // Poll every 3 seconds
  }

  /* -------------------------
     Expose showPanel for inline onclick handlers
  -------------------------*/
  window.showPanel = showPanel;
})();