// ARGS:
const threads = 3; // -T
const time = 5; // -l
const addr = "127.0.0.1"; // -s
const port = 5300; // -p
const name = "hostname.com."; // (from file or stdin)

/**
 * Formats `numerator / denominator` as a percentage.
 * @param {number} numerator
 * @param {number} denominator
 */
function fpct(numerator, denominator) {
	return `${(100 * numerator / denominator).toFixed(2)}%`;
}

/**
 * Calculates min, max, mean and stddev for `values`.
 * @param {Array<number>} values
 */
function stats(values) {
	let min = Infinity;
	let max = -Infinity;
	let M = 0;
	let S = 0;
	let mPrev;
	for (let i = 0; i < values.length; i++) {
		const value = values[i];
		if (value < min) min = value;
		if (value > max) max = value;
		mPrev = M;
		M += (value - M) / (i + 1);
		S += (value - M) * (value - mPrev);
	}
	const stdDev = Math.sqrt(S / values.length);
	return {
		min,
		max,
		mean: M,
		stdDev
	};
};

const cluster = require("cluster");

if (cluster.isMaster) {
	let sent = 0;
	let received = 0;
	let reported = 0;
	let means = [];
	let stdDevs = [];
	const responses = {};

	// Receive statistics from worker threads.
	cluster.on("message", (worker, message, handle) => {
		sent += message.sent;
		received += message.received;
		for (const [code, count] of Object.entries(message.responses)) {
			if (responses[code] === undefined) {
				responses[code] = count;
			} else {
				responses[code] += count;
			}
		}
		reported++;
		means.push(message.mean);
		stdDevs.push(message.stdDev);

		if (reported === threads) { // Report final statistics.
			// FIXME this is the mean of means and mean of StdDevs.
			const {mean, min, max} = stats(means);
			const {mean: stdDev} = stats(stdDevs);

			const otherResponses = [];
			for (const [code, count] of Object.entries(responses)) {
				if (code === "NOERROR") continue;
				otherResponses.push(
					`                        ${code} ${count} (${fpct(count, received)})`);
			}
			if (otherResponses.length) otherResponses.unshift("");

			console.log(`[Status] Testing complete (time limit)`);

			console.log(`
Statistics:

  Queries sent:         ${sent}
  Queries completed:    ${received} (${fpct(received, sent)})
  Queries lost:         ${sent - received} (${fpct(sent - received, sent)})

  Response codes:       NOERROR ${responses.NOERROR} (${fpct(responses.NOERROR, received)})${otherResponses.join("\n")}
  Run time (s):         ${time}
  Queries per second:   ${(sent / time).toFixed(6)}

  Average Latency (s):  ${(1e-9 * mean).toFixed(6)} (min ${(1e-9 * min).toFixed(6)}, max ${(1e-9 * max).toFixed(6)})
  Latency StdDev (s):   ${(1e-9 * stdDev).toFixed(6)}
`)
			process.exit(0);
		}
	});

	console.log("DNS Performance Testing Tool");
	console.log(`[Status] Sending queries (to ${addr})`);
	console.log(`[Status] Started at: ${new Date()}`);
	console.log(`[Status] Stopping after ${time} seconds`);

	for (let i = 0; i < threads; i++) cluster.fork();
} else {
	const dns = require("dns");
	dns.setServers([`${addr}:${port}`]);

	let endAt = Date.now() + time * 1000;
	let sent = 0;
	let received = 0;
	let noerror = 0;
	const responses = {};
	const latencies = [];

	function test() {
		sent++;
		const lstart = process.hrtime();
		dns.resolve4(name, (err, answer) => {
			const lat = process.hrtime(lstart);
			latencies.push(lat[1]);
			received++
			if (err) {
				if (responses[err.code] === undefined) responses[err.code] = 0;
				responses[err.code]++;
			} else {
				noerror++;
			}
			if (Date.now() > endAt) {
				const lstats = stats(latencies);
				responses.NOERROR = noerror;
				process.send({sent, received, responses, ...lstats});
			} else {
				process.nextTick(test);
			}
		});
	}
	test();
}
