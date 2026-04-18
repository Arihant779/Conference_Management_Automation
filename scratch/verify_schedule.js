const BACKEND_URL = 'http://localhost:4000';
const CONF_ID = 'db1162ca-498c-4860-909d-cb9192452292'; // Example ID

async function runTest() {
  console.log("--- Testing Schedule Conflict Detection ---");

  const conflictingSchedule = [
    {
      day: "Day 1",
      date: "2025-05-15",
      sessions: [
        {
          time: "09:00 AM",
          duration: 60,
          title: "Session A (Conflict Start)",
          room: "Room 101"
        },
        {
          time: "09:30 AM",
          duration: 30,
          title: "Session B (Overlaps A)",
          room: "Room 101"
        }
      ]
    }
  ];

  try {
    const res = await fetch(`${BACKEND_URL}/api/schedule`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conference_id: CONF_ID,
        schedule: conflictingSchedule
      })
    });
    
    if (res.status === 400) {
      const data = await res.json();
      console.log("PASS: API rejected conflicting schedule with 400.");
      console.log("Error Message:", data.error);
      console.log("Details:", data.details);
    } else if (res.ok) {
        console.log("FAIL: API accepted conflicting schedule unexpectedly.");
    } else {
        console.log("ERROR: Unexpected status code", res.status);
    }
  } catch (err) {
      console.log("ERROR: Fetch failed. Is backend running?", err.message);
  }

  console.log("\n--- Testing Valid Schedule ---");
  const validSchedule = [
    {
      day: "Day 1",
      sessions: [
        { time: "09:00 AM", duration: 60, title: "A", room: "101" },
        { time: "10:00 AM", duration: 60, title: "B", room: "101" }
      ]
    }
  ];

  try {
    const res = await fetch(`${BACKEND_URL}/api/schedule`, {
       method: 'PUT',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         conference_id: CONF_ID,
         schedule: validSchedule,
         notify: false
       })
    });
    if (res.ok) {
        console.log("PASS: API accepted valid schedule.");
    } else {
        const data = await res.json();
        console.log("FAIL: API rejected valid schedule.", data);
    }
  } catch (err) {
    console.log("FAIL: API request failed.", err.message);
  }
}

runTest();
