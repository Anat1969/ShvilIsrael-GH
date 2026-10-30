**[https://shvilisrael-gh.vercel.app](https://shvilisrael-gh.vercel.app)**

# שביל ישראל · אטלס חי

שביל ישראל מהחרמון לאילת: 56 מקטעים על מפה תלת־ממדית, פרופיל גובה, ציון התאמה מנומק לכל חודש, חי, צומח, דומם ושמיים, מדריך בכיס עם 114 תחנות, ומתכנן מסע.

```bash
npm install
npm run dev
```

בניית הנתונים מחדש (דורש Python 3 ו-Pillow):

```bash
python3 scripts/build_data.py trail climate nature
```

מקורות: OpenStreetMap, החברה להגנת הטבע (חלוקת מקטעים ועונות), AWS Terrain Tiles, ERA5 דרך Open-Meteo, iNaturalist, ויקיפדיה.
