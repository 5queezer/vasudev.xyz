---
title: "I Tried to Predict Bitcoin From Sunspots, Then Built a Startup on the Leftovers"
date: 2026-11-14
description: "How I killed a bad trading idea with proper statistics, then skipped the same rigor for the GPS business I built out of its data."
author: "Christian Pojoni"
tags: ["ai", "architecture"]
agentQuestions:
  - "Why did the Sun2BTC hypothesis fail?"
  - "What was wrong with the GPS Reliability API pivot?"
  - "Which kill criteria should a side project have before the first commit?"
series: ["Field Notes"]
---

A year ago I spent a few weeks trying to predict the price of Bitcoin from space weather. I called the project Sun2BTC, which tells you roughly how seriously I should have taken it.

The plan was simple. NOAA publishes years of daily measurements about the Sun: sunspots, proton and electron flux, how disturbed Earth's magnetic field is. I pulled five years of it, turned it into a pile of features and asked a model whether any of it helped predict what Bitcoin would do the next day. The first backtests came back "slightly better than random," and I got that little jolt you get when a dumb idea might not be dumb.

## Killing it properly

Slightly better than random is where most trading ideas go to fool their owners, so I rebuilt the whole pipeline the way Marcos López de Prado describes in *Advances in Financial Machine Learning*. That means purging training samples that overlap the test window, leaving a gap between them, weighting samples by how unique they are, and at the end asking how likely it is that you only found the best of many lucky tries.

The answer was clear. A model that only saw Bitcoin's own history and a model that also saw all the solar data were equally good, which is to say both were coin flips. The p-value came out at 1, the most "this is noise" a test can say.[^1]

The part I still find funny is that my naive first pipeline had produced almost the same scores. The careful version found the same thing and simply took away my excuse to believe it. Before, I had a promising signal. After, I had a coin flip with a lot of decimal places.

I also should have started with the question I only asked at the end: how would a solar flare get into a Bitcoin order book? There's no path. Still, I killed the idea with a real test and a threshold I'd written down in advance, and I'm happy with that part.

## The pivot

While I was staring at the solar data, I noticed one connection that does have physics behind it. Geomagnetic storms disturb the ionosphere, and the ionosphere slows down GPS signals on their way to the ground. The receiver reads that delay as extra distance, so your position drifts. Storms can also make the signal flicker so badly (scintillation) that receivers lose lock altogether. All of that is real and well understood.

So at the end of November 2025 the repository became the GPS Reliability API. My notes from that day promise a model with an AUC around 0.85, a "$10B+ Autonomous Vehicle market" and "$0 Direct Competitors." I hadn't measured any of the three.

Looking back, the order of events gives the game away. I didn't start with a farmer whose RTK tractor wandered off its line during a storm. I started with a clean dataset and a backtesting framework I didn't want to throw away, and then went looking for someone who might pay for them.

## What the model actually predicted

Here is the training target of the model that went into the product:

```python
# Target: Next 24h Max Kp Index
def create_target(df, horizon=1):
    target = df["kp_max"].shift(-horizon)
    return target.dropna()
```

That target is tomorrow's [Kp index](https://en.wikipedia.org/wiki/K-index), a single number for how stormy Earth's magnetic field is. It isn't GPS error at all. And the NOAA Space Weather Prediction Center already publishes a free [3-day Kp forecast](https://www.swpc.noaa.gov/products/3-day-forecast), which human forecasters build on top of solar wind models. I compared my model against "tomorrow will be like today." I never compared it against the free forecast.

On December 10, the commit log has a line that reads `feat: Add NOAA SWPC official forecast integration`. The product ended up showing the forecast it was supposed to beat.

## The same warning, a second time

In early December I ran the same diagnostics on the GPS model that had killed Sun2BTC. It beat "tomorrow equals today" by about five percent, which sounds fine until you read the rest of the report. The p-value was, again, essentially 1. Shuffling any single one of the features didn't change the model's score at all, which means it wasn't really using them. My own summary at the bottom said the gains were "likely artifacts of the test set, not true predictive skill."

That's the sentence that had ended the Bitcoin idea. This time I wrote up two options and picked the one I'd named "Path A: Deploy with Uncertainty Quantification." In the code it looked like this:

```python
# López de Prado: p < 0.05 indicates statistical significance
if is_significant and p_value < 0.05:
    model_reliability = "high"
else:
    model_reliability = "low"
```

So every answer from my reliability API came with a field that said the model behind it was `"low"` reliability. I called that transparency at the time. I'd call it something else now.

## Building got cheap

The repository has 143 commits over four weeks, and most of them are co-authored by Claude. In the last two days alone I added an LSTM, a solar wind model, the full model of Earth's magnetic field, a scintillation model, an aviation radiation model, a maritime dashboard, a route optimizer with a risk map, email alerts, circuit breakers, and distributed rate limiting. There's a 250-line `SCALING.md` in there, a Prometheus and Grafana setup, load tests, and two LLM-written research reports promising big performance gains. The number of users who could have hit that rate limit was zero. The last commit is from December 11, 2025.

None of that was hard, and that was the problem. An agent makes building almost free, so it multiplies whatever direction you point it in. I kept asking how to make the model better, and I got very thorough answers to that question. Nobody asked who would pay for it, because I never put that question into a prompt. When building costs nothing, the expensive mistake is a well-built answer to a question no one asked.

## Why there were no competitors

The people with a real GPS accuracy problem solved it long ago. Correction services like Trimble RTX, Hexagon TerraStar, u-blox PointPerfect and John Deere StarFire correct for ionospheric delay at the receiver's exact position, continuously. Receivers check their own fix on board with [receiver autonomous integrity monitoring](https://en.wikipedia.org/wiki/Receiver_autonomous_integrity_monitoring). Self-driving cars fuse GPS with inertial sensors, wheel odometry, lidar and cameras, so a bad satellite fix just gets less weight in a decision made within milliseconds. None of them wants to call a REST API for a daily planetary index.

And the index was too coarse anyway. Kp is one number for the whole planet every three hours. GPS errors from the ionosphere depend a lot on where you are and what time it is. Near the equator, scintillation regularly peaks after sunset even on quiet days. A global daily forecast was too blunt for anyone with a real problem and too technical for anyone with a casual one. "Zero competitors" was true. It just meant there was no market.

## What I'd write down first

For the model, I had a stop rule before I started: if the p-value isn't below 0.05, it's dead. For the business I had nothing. Next time I'll write the business version down before the first commit, the same way I'd write down a hypothesis.

It would start with the free alternative. What do people use today that costs nothing, and how much better do I have to be? Here that was the NOAA forecast, and checking it would have taken an afternoon. Then I'd talk to five people who might pay and ask what they do today when GPS gets bad. I'm fairly sure I'd have heard "the receiver handles it" or "I look at the NOAA page." And I'd pick a date. If nobody pays by then, the project stops, however nice the dashboards look.

López de Prado's deflated Sharpe ratio exists because people run many trials and report only the best one. Founders do the same thing with ideas, and nobody deflates side projects.

## What's left

The physics was never wrong. The conversion from ionospheric electron content to range error in the code checks out, and the scintillation and magnetic field modules are faithful implementations of published models. A free page that puts the NOAA forecast next to a scintillation map, for drone pilots and surveyors near the equator, might well find people who like it. That would be a nice feature. I don't think it was ever a company.

I also still own gps-reliability.com. It costs about as much as a pizza a year, which makes it the cheapest decision of the whole project and the only one that didn't overfit. The project folder on my laptop is called `gps-realibility`, and I've decided to read that as an early warning I missed.

If you fly drones, survey land or run GPS equipment and space weather has actually cost you money, write to me. You'd be my first customer interview, about a year late.

[^1]: For the curious: the Bitcoin-only baseline scored an AUC of 52.1% (±1.6), the version with all 96 space weather features 52.2% (±1.8), where 50% is guessing. Both had a p-value of 1.000. The naive pipeline's baseline had scored 51.7%. On roughly 2,000 daily samples, the 96 extra features made the regression error 14 times worse.

---

*Christian Pojoni builds infrastructure and occasionally proves his own ideas wrong. More at [vasudev.xyz](https://vasudev.xyz).*
