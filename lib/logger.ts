export function debugLog(message: string, data?: any, safeFields: string[] = []) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  if (data !== undefined) {
    console.log(message, sanitize(data, safeFields));
  } else {
    console.log(message);
  }
}

function sanitize(data: any, safeFields: string[]): any {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitize(item, safeFields));
  }
  if (typeof data === 'object') {
    const result: any = {};
    for (const key of Object.keys(data)) {
      if (safeFields.includes(key)) {
        result[key] = sanitize((data as any)[key], safeFields);
      } else {
        result[key] = '***';
      }
    }
    return result;
  }
  return safeFields.length === 0 ? data : '***';
}
