# How to Find Your Google Place ID for Sheetcutters.com

## Quick Methods to Find Your Place ID

### Method 1: Google Place ID Finder (Easiest)
1. Go to: **https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder**
2. Type "Sheetcutters" or your business address in the search box
3. Click on your business marker on the map
4. Your Place ID will appear in the info window (starts with `ChIJ...`)
5. Copy the Place ID

### Method 2: Google Maps (Quick)
1. Go to **https://www.google.com/maps**
2. Search for "Sheetcutters.com" or your business name/address
3. Click on your business listing
4. Look at the URL in your browser
5. Find the part that looks like: `!1s0x...` or after `data=`
6. The Place ID is in that URL (format: `ChIJ...`)

### Method 3: Using Place ID Finder Tool
1. Visit: **https://placekey.io/placeid**
2. Enter your business name or address
3. Click Search
4. Copy the Place ID from the results

### Method 4: Use the API Directly
If you know your business address, you can find it via API:

```bash
# Replace YOUR_API_KEY with your GOOGLE_PLACES_API_KEY
# Replace ADDRESS with your business address

curl "https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Sheetcutters&inputtype=textquery&fields=place_id,name&key=YOUR_API_KEY"
```

The response will contain your Place ID.

---

## What Does a Place ID Look Like?

A Google Place ID typically looks like:
- `ChIJN1t_tDeuEmsRUsoyG83frY4`
- `ChIJ_____XXXXXXXXXXXXXXX` (starts with `ChIJ`)
- Or sometimes: `EXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` (starts with `E`)

---

## After You Find Your Place ID

### Step 1: Add it to Supabase Secrets

1. Go to your Supabase Dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add a new secret:
   - **Name**: `GOOGLE_PLACE_ID`
   - **Value**: Your Place ID (e.g., `ChIJN1t_tDeuEmsRUsoyG83frY4`)
4. Click **Save**

### Step 2: Verify It's Working

1. Go to your Sheetcutters.com website
2. Navigate to the page where Google Reviews are displayed
3. The reviews should now load automatically
4. You should see:
   - Star rating
   - Total number of reviews
   - Recent reviews from Google

---

## Troubleshooting

### "Place ID not found"
- Make sure your business is listed on Google My Business
- Verify your business is published and visible on Google Maps
- Try searching with your exact business address

### "API key not valid"
- Check that GOOGLE_PLACES_API_KEY is set correctly
- Ensure the API key has "Places API" enabled in Google Cloud Console
- Check for billing enabled in Google Cloud (Places API requires billing)

### Reviews not showing
1. Check browser console for errors
2. Verify both `GOOGLE_PLACES_API_KEY` and `GOOGLE_PLACE_ID` are set
3. Make sure your Google business has at least one review
4. Check API quota limits in Google Cloud Console

---

## Testing Your Place ID

You can test if your Place ID works with this URL (replace placeholders):

```
https://maps.googleapis.com/maps/api/place/details/json?place_id=YOUR_PLACE_ID&fields=name,rating,user_ratings_total&key=YOUR_API_KEY
```

Expected response:
```json
{
  "result": {
    "name": "Sheetcutters",
    "rating": 4.8,
    "user_ratings_total": 50
  },
  "status": "OK"
}
```

---

## Current Status

✅ **GOOGLE_PLACES_API_KEY** - Already configured  
❌ **GOOGLE_PLACE_ID** - Needs to be added

Once you add the Place ID, your Google Reviews integration will be fully functional!

---

## Need Help?

If you can't find your Place ID:
1. Make sure your business is listed on Google My Business: https://business.google.com/
2. Claim your business if you haven't already
3. Verify your business listing is published and active
4. Contact Google My Business support if your listing doesn't appear in search

---

**Last Updated**: December 5, 2025
