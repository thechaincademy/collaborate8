# chat-rewrite-strike logs (read-only, nothing changed)

Visible range: 09:44:00.721 to 09:44:34.054 UTC, 5 Nov 2026 (25 lines in total).
calm_check lines: 18. Max ms: 2303. Error lines: none. Boot lines: 7.

## calm_check lines (newest first, verbatim)

```text
09:44:34.054 {"fn":"chat-rewrite-strike","event":"calm_check","outcome":"rewrite","reason":"rewrite","reasons":[],"attempts":1,"ms":889,"auth_ms":108,"premium_ms":413,"model_ms":775}
09:44:32.970 {"fn":"chat-rewrite-strike","event":"calm_check","outcome":"rewrite","reason":"rewrite","reasons":[],"attempts":1,"ms":1169,"auth_ms":156,"premium_ms":465,"model_ms":827}
09:44:31.450 {"fn":"chat-rewrite-strike","event":"calm_check","outcome":"rewrite","reason":"rewrite","reasons":[],"attempts":1,"ms":1139,"auth_ms":120,"premium_ms":537,"model_ms":931}
09:44:30.118 {"fn":"chat-rewrite-strike","event":"calm_check","outcome":"rewrite","reason":"rewrite","reasons":[],"attempts":1,"ms":1508,"auth_ms":318,"premium_ms":618,"model_ms":1078}
09:44:28.220 {"fn":"chat-rewrite-strike","event":"calm_check","outcome":"rewrite","reason":"rewrite","reasons":[],"attempts":1,"ms":891,"auth_ms":127,"premium_ms":428,"model_ms":759}
09:44:27.148 {"fn":"chat-rewrite-strike","event":"calm_check","outcome":"rewrite","reason":"rewrite","reasons":[],"attempts":1,"ms":1114,"auth_ms":150,"premium_ms":474,"model_ms":803}
09:44:25.552 {"fn":"chat-rewrite-strike","event":"calm_check","outcome":"fallback","reason":"retry_timeout","reasons":["retry_timeout","name","count"],"attempts":2,"ms":2301,"auth_ms":294,"premium_ms":426,"model_ms":838}
09:44:23.112 {"fn":"chat-rewrite-strike","event":"calm_check","outcome":"fallback","reason":"retry_none","reasons":["retry_none","count"],"attempts":2,"ms":2068,"auth_ms":119,"premium_ms":246,"model_ms":906}
09:44:20.868 {"fn":"chat-rewrite-strike","event":"calm_check","outcome":"fallback","reason":"retry_timeout","reasons":["retry_timeout","count"],"attempts":2,"ms":2302,"auth_ms":289,"premium_ms":237,"model_ms":905}
09:44:18.416 {"fn":"chat-rewrite-strike","event":"calm_check","outcome":"rewrite","reason":"please_added","reasons":["please_added"],"attempts":1,"ms":1155,"auth_ms":302,"premium_ms":617,"model_ms":850}
09:44:17.162 {"fn":"chat-rewrite-strike","event":"calm_check","outcome":"rewrite","reason":"please_added","reasons":["please_added"],"attempts":1,"ms":1257,"auth_ms":315,"premium_ms":421,"model_ms":937}
09:44:15.756 {"fn":"chat-rewrite-strike","event":"calm_check","outcome":"rewrite","reason":"please_added","reasons":["please_added"],"attempts":1,"ms":1273,"auth_ms":312,"premium_ms":617,"model_ms":954}
09:44:14.279 {"fn":"chat-rewrite-strike","event":"calm_check","outcome":"rewrite","reason":"rewrite","reasons":[],"attempts":1,"ms":1174,"auth_ms":318,"premium_ms":251,"model_ms":828}
09:44:12.931 {"fn":"chat-rewrite-strike","event":"calm_check","outcome":"rewrite","reason":"rewrite","reasons":[],"attempts":1,"ms":1630,"auth_ms":316,"premium_ms":619,"model_ms":1203}
09:44:10.953 {"fn":"chat-rewrite-strike","event":"calm_check","outcome":"rewrite","reason":"rewrite","reasons":[],"attempts":1,"ms":1227,"auth_ms":319,"premium_ms":687,"model_ms":840}
09:44:09.517 {"fn":"chat-rewrite-strike","event":"calm_check","outcome":"fallback","reason":"no_time_for_retry","reasons":["no_time_for_retry"],"attempts":1,"ms":1641,"auth_ms":310,"premium_ms":541,"model_ms":1284}
09:44:07.559 {"fn":"chat-rewrite-strike","event":"calm_check","outcome":"fallback","reason":"retry_timeout","reasons":["retry_timeout","time"],"attempts":2,"ms":2303,"auth_ms":318,"premium_ms":750,"model_ms":952}
09:44:04.820 {"fn":"chat-rewrite-strike","event":"calm_check","outcome":"fallback","reason":"retry_timeout","reasons":["retry_timeout","report","time"],"attempts":2,"ms":2301,"auth_ms":312,"premium_ms":543,"model_ms":969}
```

## Boot lines (verbatim)

```text
09:44:31.634 booted (time: 49ms)
09:44:28.449 booted (time: 48ms)
09:44:25.839 booted (time: 67ms)
09:44:11.128 booted (time: 47ms)
09:44:07.775 booted (time: 45ms)
09:44:05.071 booted (time: 46ms)
09:44:00.721 booted (time: 75ms)
```

## Summary
- Earliest visible: 09:44:00.721 (boot). Earliest calm_check: 09:44:04.820.
- Latest visible: 09:44:34.054.
- calm_check count: 18 (rewrite 11, fallback 7).
- Max ms: 2303 (09:44:07.559). No error or warning lines.
