// Export Service - CSV generation and download utilities

class ExportService {
  /**
   * Export data to CSV
   */
  exportToCSV<T extends Record<string, any>>(
    data: T[],
    filename: string,
    columns?: { key: keyof T; label: string }[]
  ): void {
    if (data.length === 0) return;

    const cols =
      columns ||
      Object.keys(data[0]).map((key) => ({
        key: key as keyof T,
        label: key as string,
      }));

    const escapeCSVValue = (value: unknown): string => {
      if (value === null || value === undefined) return '';

      const str = String(value);

      // Escapa aspas duplas e envolve sempre em aspas
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = cols.map((c) => escapeCSVValue(c.label)).join(',');

    const rows = data.map((item) =>
      cols
        .map((col) => {
          const value = item[col.key];
          return escapeCSVValue(value);
        })
        .join(',')
    );

    const csv = [headers, ...rows].join('\n');

    // BOM para Excel reconhecer UTF-8 corretamente
    const BOM = '\uFEFF';

    const blob = new Blob([BOM + csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const exportService = new ExportService();