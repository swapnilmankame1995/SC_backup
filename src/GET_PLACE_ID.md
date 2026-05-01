# Finding Place ID for SheetCutters

## From Your Google Maps URL

Your URL: 
```
https://www.google.com/maps/place/SheetCutters/@15.4330397,75.0163706,18.67z/data=!4m6!3m5!1s0x3bb8d3929b681289:0x87e5f31da7ae149b!8m2!3d15.4331279!4d75.0154437!16s%2Fg%2F11yrz04wfv?entry=ttu&g_ep=EgoyMDI1MTIwMi4wIKXMDSoASAFQAw%3D%3D
```

## Extracted Information:

**Business Name:** SheetCutters  
**Coordinates:** 15.4331279, 75.0154437  
**Short ID:** `/g/11yrz04wfv`  
**CID:** 0x3bb8d3929b681289:0x87e5f31da7ae149b

---

## Method 1: Use Google Place ID Finder (Recommended)

1. Go to: https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder
2. Enter these coordinates: `15.4331279, 75.0154437`
3. Or search for: "SheetCutters Hubli" or "SheetCutters Karnataka"
4. Click on the marker
5. Copy the Place ID (format: `ChIJ...`)

---

## Method 2: Use API to Find Place ID

I'll create a simple API call for you using your coordinates:

**API Request:**
```
https://maps.googleapis.com/maps/api/geocode/json?latlng=15.4331279,75.0154437&key=YOUR_GOOGLE_PLACES_API_KEY
```

Or use Text Search:
```
https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=SheetCutters+Hubli&inputtype=textquery&fields=place_id,name,formatted_address&key=YOUR_API_KEY
```

---

## Method 3: Quick Online Tool

1. Go to: https://www.gstatic.com/local/pwa/help/place_id_lookup.html
2. Enter: `SheetCutters, Hubli, Karnataka`
3. Or paste coordinates: `15.4331279, 75.0154437`
4. Get your Place ID

---

## What to Do Next:

Once you have your Place ID (it will look like `ChIJiYFoG5LYODY0m03nVqPxqhE`):

1. Add it to Supabase:
   - Dashboard → Project Settings → Edge Functions → Secrets
   - Name: `GOOGLE_PLACE_ID`
   - Value: [Your Place ID]
   - Click Save

2. Your Google Reviews will automatically start working!

---

**Location Details:**
- City: Hubli (Hubballi), Karnataka
- Coordinates: 15.4331279°N, 75.0154437°E
