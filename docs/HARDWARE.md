# SIMS hardware compatibility

SIMS is designed to work with the campus ID and access stack in your bill of materials.

## Quick reference

| Item | Model | SIMS role |
|------|--------|-----------|
| Barrier gate | FS10 / FS11 / FS20 | Controlled by access board after auth |
| Access board | ACS11-M2 | Import card holders exported from SIMS |
| Face terminal | FRS10 | Same person/card number as SIMS record |
| IC reader | RDS-20 | Wiegand 26/34; reads encoded CDS-10 cards |
| Card encoder | FDS-10 | Issue card, then capture number in SIMS |
| IC card | CDS-10 | CR-80; matches template pixel size |
| Card printer | PRS10-600 | Print SIMS templates via OS driver |
| Metal detector | MDS10 | Standalone security (no SIMS link today) |

## Card design & printing (PRS10-600 + CDS-10)

- Use **CR-80 / ID-1** templates: **1011×638 px** (landscape) or **638×1011 px** (portrait) at **300 dpi**.
- In SIMS: **Templates** → preset orientation → **Print IDs** → system print dialog → select **Entrust Sigma** driver.
- Enable duplex in the driver if printing front and back.

## Encoding cards (FDS-10 + CDS-10)

1. Encode the card with the FDS-10 (USB).
2. Open the student in SIMS → **Access card** tab.
3. Focus **Encoder capture** and tap/swipe; save the record.
4. Optional: set **Facility** and **Card** codes for Wiegand-26 (ACS11-M2).

## Gate access (RDS-20 + ACS11-M2 + FS10)

1. **Settings → Campus hardware**: set ACS board IP/port and Wiegand format (26 or 34).
2. **Settings → Export for access control** (or Students → export) downloads CSV for WG5000-compatible import.
3. Import into the access vendor software bound to the ACS11-M2.
4. Wire RDS-20 readers to the board; barriers open on valid card/face.

## Entry info board (QR / RFID lobby display)

Each school gets a public website link for a full-screen **info board**:

1. In SIMS: **Settings → Info board** — set headline, announcement, colors, welcome text; then **Copy link** / **Open board**.
2. Open that URL on the lobby TV or kiosk PC (Chrome / Edge, full screen).
3. Plug a **USB QR scanner** or **RFID reader** that acts as a keyboard (wedge). Scan/tap an ID.
4. The board flashes **photo + name + grade/section** for that school’s current year.
5. Reload the TV page after saving portal changes so announcements update.

URL shape: `http://YOUR-SERVER/board/<secret-token>`  
QR codes on printed IDs encode **Student ID**. RFID uses **card UID / Wiegand number** saved on the student Access card tab.

Admins can **New link** to invalidate an old URL if it was shared by mistake.

**Dummy API (no hardware / no DB):**

- `GET /api/dummy/board` — help + sample payload  
- `POST /api/dummy/board` with `{ "scenario": "welcome" | "staff" | "unknown" | "inactive" }`  
- On the board page, append `?demo=1` for on-screen test buttons, e.g. `/board/<token>?demo=1`

## Face terminals (FRS10)

Enroll faces in the FRS10 vendor software. Use the **same CardNo / UserID** as in SIMS (`studentId` and Wiegand card number) so logs align.

## Metal detector (MDS10)

Operates independently. SIMS does not receive events unless your vendor provides a network API (future integration).

## Detect hardware on Windows / Mac (issuing laptop)

SIMS runs in the browser, so it **cannot** see every USB port by itself. Use the **SIMS Hardware Agent** on the same laptop where the FDS-10 or Sigma printer is plugged in:

**Recommended (menu bar / system tray, starts at login):**

1. One-time: `npm run hardware-tray:setup`
2. Install login startup: `npm run hardware-tray:install` (macOS LaunchAgent / Windows Startup)
3. Or run now: `npm run hardware-tray` — look for **SIMS** in the menu bar (Mac) or tray (Windows)
4. In SIMS: **Settings → Campus hardware → Scan this computer**

**Manual (terminal):** `npm run hardware-agent` and leave it running, then scan in SIMS.

The agent lists **USB devices** and **installed printers** (Windows: PowerShell; Mac: `system_profiler` + `lpstat`). SIMS matches names to your catalog (FDS-10, PRS10-600, etc.).

Optional: in Chrome or Edge, use **Allow USB device** for extra WebUSB devices you approve manually.

**Not detected via USB (expected):** FS10 gates, ACS11-M2, FRS10, RDS-20 on the LAN, MDS10, and CDS-10 card stock — set IP / export CSV as documented above.

## Support notes

- After schema updates, run `npx prisma db push && npx prisma generate` and restart `npm run dev`.
- TCP push to ACS boards requires vendor SDK; SIMS currently exports **CSV** for manual/auto import.
