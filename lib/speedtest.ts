export type SpeedTestPhase = 'idle' | 'latency' | 'download' | 'upload' | 'completed' | 'error';

export interface LatencyMetrics {
  average: number;
  min: number;
  max: number;
  jitter: number;
  samples: number[];
}

export interface ThroughputSample {
  sizeBytes: number;
  durationSeconds: number;
  mbps: number;
}

export interface SpeedTestResult {
  downloadMbps: number | null;
  uploadMbps: number | null;
  latency: LatencyMetrics | null;
  timestamp: number;
}

export interface SpeedTestHistoryEntry extends SpeedTestResult {
  isp?: string;
}

export interface RunSpeedTestOptions {
  onProgress?: (progress: number, phase: SpeedTestPhase) => void;
  signal?: AbortSignal;
  enableUpload?: boolean;
  retries?: number;
}

const CLOUDFLARE_DOWNLOAD_ENDPOINT = 'https://speed.cloudflare.com/__down?bytes=';
const CLOUDFLARE_UPLOAD_ENDPOINT = 'https://speed.cloudflare.com/__up';
const CLOUDFLARE_META_ENDPOINT = 'https://speed.cloudflare.com/meta';

const DOWNLOAD_SIZES = [1_048_576, 5_242_880, 10_485_760]; // 1MB, 5MB, 10MB in bytes
const UPLOAD_SIZES = [1_048_576, 2_097_152];
const LATENCY_ATTEMPTS = 8;

const withRetry = async <T>(fn: () => Promise<T>, retries = 2): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  throw lastError;
};

export const getIspInformation = async (): Promise<string | undefined> => {
  try {
    const res = await fetch(CLOUDFLARE_META_ENDPOINT, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed metadata request: ${res.status}`);
    }
    const data = await res.json();
    return data?.client?.asn?.name || data?.client?.iata || data?.client?.ip;
  } catch (error) {
    console.warn('Unable to fetch ISP metadata', error);
    return undefined;
  }
};

const measureLatency = async (signal?: AbortSignal): Promise<LatencyMetrics> => {
  const samples: number[] = [];
  for (let i = 0; i < LATENCY_ATTEMPTS; i += 1) {
    const url = `${CLOUDFLARE_DOWNLOAD_ENDPOINT}0&ts=${Date.now()}-${i}`;
    const start = performance.now();
    const response = await fetch(url, { cache: 'no-store', signal });
    if (!response.ok) {
      throw new Error(`Latency request failed with status ${response.status}`);
    }
    await response.arrayBuffer();
    const duration = performance.now() - start;
    samples.push(duration);
  }
  const average = samples.reduce((acc, value) => acc + value, 0) / samples.length;
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const jitter =
    samples.reduce((acc, value) => acc + Math.abs(value - average), 0) / samples.length;
  return {
    average,
    min,
    max,
    jitter,
    samples
  };
};

const measureDownloadForSize = async (sizeBytes: number, signal?: AbortSignal): Promise<ThroughputSample> => {
  const cacheBuster = `&ts=${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const url = `${CLOUDFLARE_DOWNLOAD_ENDPOINT}${sizeBytes}${cacheBuster}`;
  const start = performance.now();
  const response = await fetch(url, {
    cache: 'no-store',
    signal
  });
  if (!response.ok) {
    throw new Error(`Download request failed with status ${response.status}`);
  }
  await response.arrayBuffer();
  const seconds = (performance.now() - start) / 1000;
  const mbps = (sizeBytes * 8) / seconds / 1_000_000;
  return {
    sizeBytes,
    durationSeconds: seconds,
    mbps
  };
};

const measureUploadForSize = async (sizeBytes: number, signal?: AbortSignal): Promise<ThroughputSample> => {
  const data = new Uint8Array(sizeBytes);
  crypto.getRandomValues(data);
  const params = new URLSearchParams({ bytes: String(sizeBytes) });
  const start = performance.now();
  const response = await fetch(`${CLOUDFLARE_UPLOAD_ENDPOINT}?${params.toString()}`, {
    method: 'POST',
    body: data,
    cache: 'no-store',
    signal,
    keepalive: true
  });
  if (!response.ok) {
    throw new Error(`Upload request failed with status ${response.status}`);
  }
  await response.arrayBuffer();
  const seconds = (performance.now() - start) / 1000;
  const mbps = (sizeBytes * 8) / seconds / 1_000_000;
  return {
    sizeBytes,
    durationSeconds: seconds,
    mbps
  };
};

const averageThroughput = (samples: ThroughputSample[]): number => {
  if (!samples.length) return 0;
  const total = samples.reduce((acc, sample) => acc + sample.mbps, 0);
  return total / samples.length;
};

export const runSpeedTest = async ({
  onProgress,
  signal,
  enableUpload = true,
  retries = 2
}: RunSpeedTestOptions = {}): Promise<SpeedTestResult> => {
  const progress = (value: number, phase: SpeedTestPhase) => {
    if (onProgress) {
      onProgress(Math.min(100, Math.max(0, value)), phase);
    }
  };

  progress(2, 'latency');
  const latency = await withRetry(() => measureLatency(signal), retries);
  progress(20, 'latency');

  const downloadSamples: ThroughputSample[] = [];
  for (let i = 0; i < DOWNLOAD_SIZES.length; i += 1) {
    const size = DOWNLOAD_SIZES[i];
    const sample = await withRetry(() => measureDownloadForSize(size, signal), retries);
    downloadSamples.push(sample);
    progress(20 + ((i + 1) / DOWNLOAD_SIZES.length) * 55, 'download');
  }
  const downloadMbps = averageThroughput(downloadSamples);

  let uploadMbps: number | null = null;
  if (enableUpload) {
    const uploadSamples: ThroughputSample[] = [];
    for (let i = 0; i < UPLOAD_SIZES.length; i += 1) {
      const size = UPLOAD_SIZES[i];
      const sample = await withRetry(() => measureUploadForSize(size, signal), retries);
      uploadSamples.push(sample);
      progress(80 + ((i + 1) / UPLOAD_SIZES.length) * 18, 'upload');
    }
    uploadMbps = averageThroughput(uploadSamples);
  }

  progress(100, 'completed');

  return {
    downloadMbps,
    uploadMbps,
    latency,
    timestamp: Date.now()
  };
};
