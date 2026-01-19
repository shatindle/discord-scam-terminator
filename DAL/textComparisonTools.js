const MINIMUM_CHARACTERS = 280;
const MINIMUM_THRESHOLD = 0.88;

/**
 * @description Determines if the sentence is long enough to be considered spam
 * @param {string} sentence 
 * @returns {boolean} True means this is a candidate for spam
 */
const candidateForComparison = (sentence) => typeof(sentence) === "string" && sentence.length >= MINIMUM_CHARACTERS;

// https://en.wikipedia.org/wiki/Levenshtein_distance
// based on answer by overlord1234
// https://stackoverflow.com/questions/10473745/compare-strings-javascript-return-of-likely
function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i == 0)
                costs[j] = j;
            else {
                if (j > 0) {
                let newValue = costs[j - 1];
                if (s1.charAt(i - 1) != s2.charAt(j - 1))
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0)
        costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

/**
 * @description Calculates the percent liklihood that two sentences are the same
 * @param {string} s1 
 * @param {string} s2 
 * @returns {number}
 */
function textSimilarity(s1, s2) {
    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    const longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

/**
 * @description Determines if text is too similar and should be considered the same
 * @param {string} s1 
 * @param {string} s2 
 * @returns {boolean}
 */
function textTooSimilar(s1, s2) {
    const result = textSimilarity(s1, s2);

    return result > MINIMUM_THRESHOLD;
}

module.exports = {
    textTooSimilar,
    candidateForComparison
};