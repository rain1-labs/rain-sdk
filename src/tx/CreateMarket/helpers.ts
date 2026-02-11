export function normalizeBarValues(values: (number)[]): number[] {
    const transformedBarValues = [
        ...values.map((value) => Math.floor(value * 100)),
    ];
    const totalRounded = transformedBarValues.reduce(
        (sum, val) => sum + val,
        0
    );
    const difference = 10000 - totalRounded;
    if (difference !== 0) {
        transformedBarValues[transformedBarValues.length - 1] += difference;
    }

    return transformedBarValues
}
