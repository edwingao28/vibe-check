export class IRStore {
    facts = [];
    colors = [];
    texts = [];
    structures = [];
    suppressions = [];
    extractorHealth = new Map();
    extractorResults = [];
    addExtractorResult(result) {
        this.extractorResults.push(result);
        this.facts.push(...result.facts);
        this.colors.push(...result.colors);
        this.texts.push(...result.texts);
        this.structures.push(...result.structures);
        this.suppressions.push(...result.suppressions);
        this.extractorHealth.set(result.name, result.status);
    }
    getExtractorResults() {
        return this.extractorResults;
    }
    getCoverage() {
        const filesAttempted = this.extractorResults.reduce((sum, r) => sum + r.filesAttempted, 0);
        const filesParsed = this.extractorResults.reduce((sum, r) => sum + r.filesParsed, 0);
        return {
            filesAttempted,
            filesParsed,
            overallCoverage: filesAttempted > 0 ? filesParsed / filesAttempted : 1,
        };
    }
}
//# sourceMappingURL=store.js.map