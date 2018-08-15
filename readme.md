Simple, zero-dependency, Node.js version of https://github.com/akamai/dnsperf
for measuring DNS server throughput and latency.

Limitations:
* There's no CLI parser yet -- instead you need to modify the first few lines of
  dnsperf.js.
* Only a few parameters are supported. PRs welcome to add more of dnsperf's
  features. (Please try to avoid adding dependencies though.)

The reported statistics are on-par with dnssec's reported statistics.

```
> node .\benchmark.js
DNS Performance Testing Tool
[Status] Sending queries (to 127.0.0.1)
[Status] Started at: Tue Aug 14 2018 19:51:36 GMT-0700 (Pacific Daylight Time)
[Status] Stopping after 5 seconds
[Status] Testing complete (time limit)

Statistics:

  Queries sent:         67398
  Queries completed:    67398 (100.00%)
  Queries lost:         0 (0.00%)

  Response codes:       NOERROR 67390 (99.99%)
                        ESERVFAIL 8 (0.01%)
  Run time (s):         5
  Queries per second:   13479.600000

  Average Latency (s):  0.000218 (min 0.000218, max 0.000218)
  Latency StdDev (s):   0.000069
```
