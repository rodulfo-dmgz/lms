// PapaParse chargé via CDN dans index.html
export function parseCSV(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: h => h.trim().toLowerCase().replace(/["\s]/g, ''),
            transform:       v => v.trim(),
            complete: (results) => resolve(results),
            error:    (err)     => reject(err)
        });
    });
}
