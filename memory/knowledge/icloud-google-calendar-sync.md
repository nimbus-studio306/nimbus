# iCloud CalDAV Sync with Google Calendar

**Date:** 2026-03-12
**Status:** Research Complete
**Next Steps:** Awaiting Zsolt's decision on preferred approach

---

## Summary

Google Calendar **does not officially support two-way sync** with iCloud CalDAV. Google supports CalDAV **import/export** but only for incoming events, not bi-directional synchronization.

---

## Official Google Calendar CalDAV Support

### What Google Supports:
1. **CalDAV Import** — Can subscribe to a CalDAV calendar URL
2. **CalDAV Export** — Can export events in ICS format
3. **iCloud Calendar URL Format:**
   ```
   https://caldav.icloud.com/{username}/personal/
   ```

### What Google Does NOT Support:
- **Two-way sync** (events created on iCloud don't appear in Google)
- **Real-time sync** (no push notifications)
- **Conflict resolution** (duplicate event handling)
- **Google as primary** (can't set Google as the "source of truth")

---

## Recommended Approaches

### Option 1: iCloud → Google Calendar (One-Way)

**Use Case:** Use Google as the "source of truth," sync to iCloud occasionally.

**Methods:**
1. **Manual Export (Quickest):**
   - Export iCloud calendar as ICS file
   - Import into Google Calendar
   - Repeat as needed

2. **Automated Script (Better):**
   - Create script to:
     - Export iCloud events as ICS
     - Import into Google Calendar
   - Schedule via cron (e.g., weekly)

**Pros:**
- No third-party tools required
- Simple, reliable
- Full control

**Cons:**
- Manual triggers or cron scheduling needed
- No real-time sync
- Google becomes source of truth (not iCloud)

---

### Option 2: Third-Party Sync Services

**Services:**
- **Sync2Cloud** (third-party, not official)
- **iMazing Cloud Sync** (paid)
- **Readdle SyncMate** (paid)
- **CalendarBridge** (cloud-based, requires login)

**Pros:**
- Automatic, real-time sync
- Often supports two-way sync
- Cross-platform

**Cons:**
- Cost (paid services)
- Rely on third-party
- Privacy concerns (sync data through external servers)
- Not official Google/iCloud integration

---

### Option 3: Use iCloud Calendar Directly (No Google)

**Use Case:** Don't need Google Calendar at all, rely on iCloud.

**Pros:**
- Native, official solution
- Built-in sync across devices
- Free
- No extra tools needed

**Cons:**
- Can't use Google Calendar features (meeting links, integrations)
- Limited to Apple ecosystem for full experience
- No Google Calendar web app access (though iCloud provides web)

---

### Option 4: Hybrid Approach (Two Calendars)

**Use Case:** Use both services, sync occasionally.

**Setup:**
- Primary calendar: Google Calendar (work, meetings, integration with other apps)
- Secondary calendar: iCloud Calendar (personal, backup)

**Methods:**
- Keep Google as primary
- Periodically export/import iCloud events to Google
- Or vice versa depending on needs

---

## Recommended Strategy for Zsolt

Based on Zsolt's use case:

1. **Primary Calendar:** Google Calendar (papperpictures@gmail.com)
   - Used for work, meetings, integrations
   - Easier to manage with multiple accounts

2. **Sync from iCloud → Google:**
   - Once every 1-2 weeks
   - Export iCloud events → import to Google
   - Scripted for automation (10 minutes of setup)

3. **Alternative:** Use iCloud Calendar directly for personal events
   - Export occasionally to Google for backup
   - Let Google be "work" calendar, iCloud be "personal"

---

## Implementation Options

### Scripted Sync (Option 1)

**Tool:** Python + icalendar library

**Script Features:**
- Fetch iCloud CalDAV calendar
- Parse events
- Check for duplicates (by UID/GUID)
- Import into Google Calendar via API
- Log sync results

**Setup Time:** ~2-3 hours (OAuth, error handling, testing)

**Maintenance:** Minimal (hourly cron, daily checks)

**Pros:**
- Free, permanent solution
- Full control
- Customizable

**Cons:**
- Requires coding/scripting
- OAuth token management
- Bug fixes needed if Google changes API

---

### Third-Party Tool (Option 2)

**Tool:** Sync2Cloud or similar

**Setup Time:** ~30 minutes (download, configure)

**Maintenance:** Low (automatic, handles updates)

**Pros:**
- Quick setup
- Automatic sync
- Handles conflicts

**Cons:**
- Paid (usually $20-50/year)
- Rely on third-party
- Privacy concerns

---

## Open Questions for Zsolt

1. **Which calendar is the "source of truth"?**
   - Google Calendar (recommended for work)
   - iCloud Calendar (recommended for personal)

2. **How often do you need sync?**
   - Real-time (third-party service)
   - Weekly (scripted)
   - Monthly (manual export/import)

3. **Which events should be in which calendar?**
   - Work events → Google Calendar
   - Personal events → iCloud Calendar
   - Mixed → both calendars

4. **Budget for sync solution?**
   - Free (scripted)
   - Paid (third-party)

5. **Privacy concerns?**
   - Prefer no third-party services
   - Accept some risk for convenience

---

## Decision Matrix

| Approach | Cost | Setup Time | Sync Frequency | Privacy | Reliability |
|----------|------|------------|----------------|---------|-------------|
| iCloud → Google (scripted) | Free | 2-3 hrs | Scheduled (cron) | High (self-hosted) | High |
| Third-party sync service | $20-50/yr | 30 min | Real-time | Low (third-party) | Medium-High |
| Manual export/import | Free | 5 min per sync | Manual | High | Low |
| iCloud only | Free | 0 min | Native | High | High |

---

## Recommended Action

**For now:** Use **Option 1 (iCloud → Google, scripted)**

**Why:**
- Free, permanent solution
- No privacy concerns
- Can always upgrade to third-party if needed
- Full control over implementation

**Next Steps:**
1. Review this document with Zsolt
2. Clarify which calendar is primary
3. Decide sync frequency
4. Implement scripted sync
