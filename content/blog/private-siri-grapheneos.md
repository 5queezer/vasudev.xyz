---
title: "The Private Siri Already Exists. It Just Isn't Assembled Yet."
date: 2026-03-31
tags: ["grapheneos", "llm", "privacy", "android", "voice-assistant", "llama.cpp"]
description: "All the pieces for an on-device, privacy-first Siri alternative on GrapheneOS exist today. The missing part isn't a model -- it's 50 lines of glue."
images: ["/blog/private-siri-grapheneos/og-image.png"]
---

I spent an afternoon asking what a privacy-first voice assistant on GrapheneOS actually looks like in 2026. Not in theory -- in terms of what you can wire together this weekend with existing tools.

The answer surprised me. The hard parts are solved. The missing part is embarrassingly small.

**All the components exist on-device today. What's missing is a 50-line orchestrator.**

---

## The Problem with Existing Answers

Dicio is the default recommendation on the GrapheneOS forums, and it deserves the recommendation: fully on-device STT via Vosk, wake word support via OpenWakeWord, F-Droid distribution, German language support. For single-intent requests -- "set a timer", "call Laura", "what's 15% of 84" -- it works.

The wall it hits is compound requests. "Add Laura to the calendar and send her a mail about it" requires understanding two intents from a single utterance, extracting the same entity across both, and chaining the execution in the right order. That's not a Vosk problem. That's not even an NLU problem in the traditional sense. That's an agent problem, and Dicio's skill architecture wasn't designed for it.

The instinct is to reach for a bigger system. Port OpenVoiceOS. Run a full assistant stack. But OpenVoiceOS is Python on ALSA on D-Bus on systemd -- none of which exist on Android. A "port" would be a rewrite.

The better question is: what does Android already give you?

---

## What Android Already Gives You

Android has two underused CLI tools that change the calculus entirely: `am` (Activity Manager) and `content`. Both are available in Termux without root.

`am start` fires any Intent the OS accepts -- including `android.intent.action.SENDTO` for mail, `android.intent.action.INSERT` for contacts, navigation Intents for maps. `content insert` writes directly to ContentProviders -- including `CalendarContract.Events` for calendar entries and `AlarmClock` for alarms. These are the same APIs a native Android app would use. They're just also available from a shell.

```bash
# Create a calendar event
content insert --uri content://com.android.calendar/events \
  --bind title:s:"Coffee with Laura" \
  --bind dtstart:l:$(date -d "tomorrow 10:00" +%s000) \
  --bind dtend:l:$(date -d "tomorrow 11:00" +%s000) \
  --bind hasAlarm:i:1

# Open mail compose with subject pre-filled
am start -a android.intent.action.SENDTO \
  -d mailto:laura@example.com \
  --es android.intent.extra.SUBJECT "Re: our meeting tomorrow"
```

Two shell commands. No Java. No Kotlin. No APK signing.

The question becomes: who decides which commands to run?

---

## The LLM as Intent Router

This is where small on-device models earn their place -- not as conversational AI, but as structured output machines.

The task is narrow: take a natural language utterance, output a JSON array of intents with extracted entities. That's it. You don't need reasoning. You don't need knowledge. You need reliable structure.

A 3-4B model handles this well. On a Pixel 10 with Tensor G5, Phi-4-mini via llama.cpp runs comfortably within the ~9GB available to user apps. The system prompt is minimal:

```
You are an intent extractor. Given a voice command, output ONLY a JSON array.
Each element has: intent (string), entities (object).
Known intents: calendar.add, mail.send, reminder.set, alarm.set, call.make, navigate.to
Output no prose. Output no explanation. Output only valid JSON.
```

Input: "add Laura to the calendar tomorrow at 10 and send her a mail about it"

Output:
```json
[
  {
    "intent": "calendar.add",
    "entities": { "contact": "Laura", "time": "tomorrow 10:00" }
  },
  {
    "intent": "mail.send",
    "entities": { "to": "Laura", "subject": "Re: tomorrow's meeting" }
  }
]
```

The model doesn't execute anything. It just produces a dispatch table. A 50-line Python script in Termux reads that JSON and fires the corresponding `am`/`content` commands.

---

## The Stack, Assembled

```
Wake word     FUTO Voice Input (APK, on-device, no cloud)
     |
     v
STT           FUTO or whisper.cpp -- Pixel 10 handles whisper-small comfortably
     |
     v
Intent        llama.cpp + Phi-4-mini, system prompt locked to JSON output
extraction    ~1-2s on Tensor G5 CPU; Vulkan backend untested but promising
     |
     v
Dispatch      50-line Python: JSON -> am/content shell calls
     |
     v
OS            CalendarContract, Intent.ACTION_SENDTO, AlarmClock, etc.
```

No custom APK. No Android Studio. No Play Store. Runs in Termux. Installable in an afternoon.

---

## The One Unknown: GrapheneOS Permissions

GrapheneOS hardens inter-app data access beyond stock Android. Whether `content insert` into CalendarContract works from Termux -- without a signed APK holding the right permission -- is the actual open question. This isn't a dealbreaker; it might just require granting Termux the WRITE_CALENDAR permission explicitly, which GrapheneOS's per-app permission controls support. But it needs a 20-minute test before committing to anything bigger.

If ContentProvider writes are blocked, the fallback is Intent-only dispatch: instead of writing directly to the calendar, fire `Intent.ACTION_INSERT` at the Calendar app and let it handle the write. Less elegant, opens a UI briefly, but fully within Android's permission model.

---

## What This Isn't

This is a PoC, not a product. Wake word reliability depends on OpenWakeWord model quality. Inference latency -- even at 1-2 seconds -- breaks the feel of a fluid assistant. Entity extraction degrades on ambiguous input ("add Laura" requires knowing Laura's contact details exist somewhere). German language quality on small models varies significantly by model family.

None of these are fundamental blockers. They're v2 problems. The v1 question is whether the dispatch layer works at all, and that's answerable this weekend.

---

## The Actual Gap

The missing piece in the FOSS Android voice assistant ecosystem isn't better STT, a smarter LLM, or a more featureful app. It's a dispatcher: a small, auditable piece of software that takes structured intent JSON and translates it into Android OS calls.

That dispatcher, packaged as a Dicio skill, would give every privacy-first Android user compound intent support without touching the STT or LLM layers. It's the unglamorous connective tissue that makes the rest useful.

If you test this on GrapheneOS -- especially the ContentProvider write permissions -- I'd like to know what you find.

Start here: [FUTO Voice Input](https://voiceinput.futo.org/), [Dicio on F-Droid](https://f-droid.org/packages/org.stypox.dicio/), [llama.cpp Android builds](https://github.com/ggerganov/llama.cpp).

---

*Christian Pojoni builds privacy-first tools at [vasudev.xyz](https://vasudev.xyz).*
