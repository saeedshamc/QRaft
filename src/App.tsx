import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import JSZip from 'jszip';
import {
  Link as LinkIcon,
  Type,
  Mail,
  Phone,
  MessageSquare,
  Wifi,
  User,
  MapPin,
  Calendar,
  Download,
  Copy,
  Printer,
  Camera,
  History,
  Bookmark,
  Trash2,
  FileSpreadsheet,
  Check,
  AlertCircle,
  X,
  ChevronDown,
  Moon,
  Sun,
  Share2,
} from 'lucide-react';

type ContentType = 'url' | 'text' | 'email' | 'phone' | 'sms' | 'wifi' | 'vcard' | 'location' | 'calendar' | 'batch';

interface QRSettings {
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  size: number;
  fgColor: string;
  bgColor: string;
  transparentBg: boolean;
  margin: number;
  dotStyle: 'square' | 'rounded' | 'dots';
  logo: string | null;
  logoSize: number;
}

interface HistoryItem {
  id: string;
  content: string;
  contentType: ContentType;
  settings: QRSettings;
  timestamp: number;
  label: string;
}

interface Preset {
  id: string;
  name: string;
  settings: QRSettings;
}

interface FormData {
  url: string;
  text: string;
  email: { to: string; subject: string; body: string };
  phone: string;
  sms: { phone: string; message: string };
  wifi: { ssid: string; password: string; encryption: 'WPA' | 'WEP' | 'None'; hidden: boolean };
  vcard: { firstName: string; lastName: string; phone: string; email: string; org: string; url: string };
  location: { lat: string; lng: string; address: string };
  calendar: { title: string; start: string; end: string; location: string; description: string };
}

const defaultFormData: FormData = {
  url: 'https://example.com',
  text: 'Hello, World!',
  email: { to: 'example@email.com', subject: 'Hello', body: 'This is a test email.' },
  phone: '+1234567890',
  sms: { phone: '+1234567890', message: 'Hello!' },
  wifi: { ssid: 'MyNetwork', password: 'password123', encryption: 'WPA', hidden: false },
  vcard: { firstName: 'John', lastName: 'Doe', phone: '+1234567890', email: 'john@example.com', org: 'Company', url: 'https://example.com' },
  location: { lat: '40.7128', lng: '-74.0060', address: 'New York City' },
  calendar: { title: 'Meeting', start: '', end: '', location: 'Office', description: 'Team meeting' },
};

const defaultSettings: QRSettings = {
  errorCorrection: 'M',
  size: 300,
  fgColor: '#000000',
  bgColor: '#ffffff',
  transparentBg: false,
  margin: 4,
  dotStyle: 'square',
  logo: null,
  logoSize: 20,
};

const contentTypes: { id: ContentType; label: string; icon: React.ReactNode }[] = [
  { id: 'url', label: 'URL', icon: <LinkIcon size={16} /> },
  { id: 'text', label: 'Text', icon: <Type size={16} /> },
  { id: 'email', label: 'Email', icon: <Mail size={16} /> },
  { id: 'phone', label: 'Phone', icon: <Phone size={16} /> },
  { id: 'sms', label: 'SMS', icon: <MessageSquare size={16} /> },
  { id: 'wifi', label: 'Wi-Fi', icon: <Wifi size={16} /> },
  { id: 'vcard', label: 'vCard', icon: <User size={16} /> },
  { id: 'location', label: 'Location', icon: <MapPin size={16} /> },
  { id: 'calendar', label: 'Event', icon: <Calendar size={16} /> },
  { id: 'batch', label: 'Batch', icon: <FileSpreadsheet size={16} /> },
];

const errorCorrectionLevels = [
  { value: 'L', label: 'Low (7%)', desc: 'Up to 7% damage tolerance' },
  { value: 'M', label: 'Medium (15%)', desc: 'Up to 15% damage tolerance' },
  { value: 'Q', label: 'Quartile (25%)', desc: 'Up to 25% damage tolerance' },
  { value: 'H', label: 'High (30%)', desc: 'Up to 30% damage tolerance' },
];

function App() {
  const [contentType, setContentType] = useState<ContentType>('url');
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [settings, setSettings] = useState<QRSettings>(defaultSettings);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrSvg, setQrSvg] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [copied, setCopied] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerResult, setScannerResult] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState(0);
  const [csvData, setCsvData] = useState<string>('');
  const [moduleCount, setModuleCount] = useState(0);
  const [dataCapacity, setDataCapacity] = useState(0);
  const [newPresetName, setNewPresetName] = useState('');
  const [showPresetModal, setShowPresetModal] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerAnimationRef = useRef<number>();

  // Load history and presets from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('qr-history');
    const savedPresets = localStorage.getItem('qr-presets');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedPresets) setPresets(JSON.parse(savedPresets));
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('qr-history', JSON.stringify(history));
  }, [history]);

  // Save presets to localStorage
  useEffect(() => {
    localStorage.setItem('qr-presets', JSON.stringify(presets));
  }, [presets]);

  // Parse URL params for shareable link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type') as ContentType;
    const data = params.get('data');
    const settingsParam = params.get('settings');

    if (type && contentTypes.find(t => t.id === type)) {
      setContentType(type);
      if (data) {
        try {
          const parsedData = JSON.parse(decodeURIComponent(data));
          setFormData(prev => ({ ...prev, [type]: parsedData }));
        } catch {
          if (type === 'url' || type === 'text' || type === 'phone') {
            setFormData(prev => ({ ...prev, [type]: data }));
          }
        }
      }
      if (settingsParam) {
        try {
          setSettings(JSON.parse(decodeURIComponent(settingsParam)));
        } catch {}
      }
    }
  }, []);

  // Generate QR content string
  const getQRContent = useCallback((type: ContentType, data: FormData): string => {
    switch (type) {
      case 'url':
        let url = data.url.trim();
        if (!/^https?:\/\//i.test(url)) {
          url = 'https://' + url;
        }
        return url;
      case 'text':
        return data.text;
      case 'email':
        const mailto = new URLSearchParams();
        if (data.email.subject) mailto.set('subject', data.email.subject);
        if (data.email.body) mailto.set('body', data.email.body);
        return `mailto:${data.email.to}?${mailto.toString()}`;
      case 'phone':
        return `tel:${data.phone}`;
      case 'sms':
        return `smsto:${data.sms.phone}?body=${encodeURIComponent(data.sms.message)}`;
      case 'wifi':
        const wifiStr = `WIFI:T:${data.wifi.encryption};S:${data.wifi.ssid};P:${data.wifi.password};H:${data.wifi.hidden ? 'true' : 'false'};;`;
        return wifiStr;
      case 'vcard':
        return `BEGIN:VCARD
VERSION:3.0
N:${data.vcard.lastName};${data.vcard.firstName}
FN:${data.vcard.firstName} ${data.vcard.lastName}
TEL:${data.vcard.phone}
EMAIL:${data.vcard.email}
ORG:${data.vcard.org}
URL:${data.vcard.url}
END:VCARD`;
      case 'location':
        const lat = parseFloat(data.location.lat);
        const lng = parseFloat(data.location.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          return `geo:${lat},${lng}`;
        }
        return `geo:0,0?q=${encodeURIComponent(data.location.address)}`;
      case 'calendar':
        const formatDate = (d: string) => {
          if (!d) return '';
          const date = new Date(d);
          return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        return `BEGIN:VEVENT
DTSTART:${formatDate(data.calendar.start)}
DTEND:${formatDate(data.calendar.end)}
SUMMARY:${data.calendar.title}
LOCATION:${data.calendar.location}
DESCRIPTION:${data.calendar.description}
END:VEVENT`;
      default:
        return '';
    }
  }, []);

  // Debounced QR generation
  useEffect(() => {
    const timeout = setTimeout(() => {
      generateQR();
    }, 300);

    return () => clearTimeout(timeout);
  }, [contentType, formData, settings]);

  const generateQR = useCallback(async () => {
    const content = getQRContent(contentType, formData);
    if (!content || contentType === 'batch') {
      setQrDataUrl('');
      setQrSvg('');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const options: QRCode.QRCodeToFileOptions = {
        errorCorrectionLevel: settings.errorCorrection,
        margin: settings.margin,
        color: {
          dark: settings.fgColor,
          light: settings.transparentBg ? 'transparent' : settings.bgColor,
        },
        width: settings.size,
      };

      // Generate PNG data URL
      const dataUrl = await QRCode.toDataURL(content, options);
      setQrDataUrl(dataUrl);

      // Generate SVG
      const svg = await QRCode.toString(content, {
        ...options,
        type: 'svg',
      });
      setQrSvg(svg);

      // Calculate module count (simplified estimation)
      const version = Math.ceil(content.length / 17) + 1;
      const modules = 17 + version * 4;
      setModuleCount(modules);
      setDataCapacity(Math.pow(2, Math.ceil(Math.log2(content.length + 1))));

      // Add logo overlay if present
      if (settings.logo && dataUrl) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.onload = () => {
            canvas.width = settings.size;
            canvas.height = settings.size;
            ctx.drawImage(img, 0, 0);

            const logo = new Image();
            logo.onload = () => {
              const logoWidth = settings.size * (settings.logoSize / 100);
              const logoHeight = logo.height * (logoWidth / logo.width);
              const x = (settings.size - logoWidth) / 2;
              const y = (settings.size - logoHeight) / 2;
              ctx.drawImage(logo, x, y, logoWidth, logoHeight);
              setQrDataUrl(canvas.toDataURL());
            };
            logo.src = settings.logo!;
          };
          img.src = dataUrl;
        }
      }
    } catch {
      setError('QR is too dense. Lower error correction or shorten content.');
      setQrDataUrl('');
      setQrSvg('');
    }

    setIsGenerating(false);
  }, [contentType, formData, getQRContent, settings]);

  const handleExportPNG = async () => {
    if (!qrDataUrl) return;
    const scale = window.devicePixelRatio * 2;
    const canvas = document.createElement('canvas');
    canvas.width = settings.size * scale;
    canvas.height = settings.size * scale;
    const ctx = canvas.getContext('2d')!;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const link = document.createElement('a');
      link.download = 'qrcode.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = qrDataUrl;
  };

  const handleExportSVG = () => {
    if (!qrSvg) return;
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'qrcode.svg';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!qrDataUrl) return;
    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const handlePrint = () => {
    if (!qrDataUrl) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Print QR Code</title></head>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;">
            <img src="${qrDataUrl}" style="max-width:100%;max-height:100vh;">
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSettings(prev => ({ ...prev, logo: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addToHistory = () => {
    const content = getQRContent(contentType, formData);
    if (!content || contentType === 'batch') return;

    const item: HistoryItem = {
      id: Date.now().toString(),
      content,
      contentType,
      settings: { ...settings },
      timestamp: Date.now(),
      label: contentType.toUpperCase(),
    };

    setHistory(prev => [item, ...prev.slice(0, 9)]);
  };

  const restoreFromHistory = (item: HistoryItem) => {
    setContentType(item.contentType);
    setSettings(item.settings);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setHistory([]);
    setShowHistory(false);
  };

  const savePreset = () => {
    if (!newPresetName.trim()) return;

    const preset: Preset = {
      id: Date.now().toString(),
      name: newPresetName,
      settings: { ...settings },
    };

    setPresets(prev => [...prev, preset]);
    setNewPresetName('');
    setShowPresetModal(false);
  };

  const loadPreset = (preset: Preset) => {
    setSettings(preset.settings);
    setShowPresets(false);
  };

  const deletePreset = (id: string) => {
    setPresets(prev => prev.filter(p => p.id !== id));
  };

  const handleShareURL = () => {
    const params = new URLSearchParams();
    params.set('type', contentType);
    if (['url', 'text', 'phone'].includes(contentType)) {
      params.set('data', (formData as Record<string, string>)[contentType]);
    } else {
      params.set('data', JSON.stringify(formData[contentType as keyof FormData]));
    }
    params.set('settings', JSON.stringify(settings));

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyboard = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      addToHistory();
      handleExportPNG();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [handleKeyboard]);

  // QR Scanner
  const startScanner = async () => {
    setShowScanner(true);
    setScannerResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanQRCode();
      }
    } catch {
      setError('Camera access denied');
      setShowScanner(false);
    }
  };

  const scanQRCode = useCallback(() => {
    if (!videoRef.current || !scannerCanvasRef.current) return;

    const canvas = scannerCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        setScannerResult(code.data);
        stopScanner();
        return;
      }
    }

    scannerAnimationRef.current = requestAnimationFrame(scanQRCode);
  }, []);

  const stopScanner = () => {
    if (scannerAnimationRef.current) {
      cancelAnimationFrame(scannerAnimationRef.current);
    }
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(t => t.stop());
    }
    setShowScanner(false);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvData(event.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  };

  const generateBatch = async () => {
    const lines = csvData.split('\n').filter(l => l.trim());
    if (!lines.length) return;

    const zip = new JSZip();
    const total = lines.length;

    for (let i = 0; i < total; i++) {
      const line = lines[i];
      const [content, filename] = line.split(',');
      const data = content.trim();

      try {
        const options: QRCode.QRCodeToFileOptions = {
          errorCorrectionLevel: settings.errorCorrection,
          margin: settings.margin,
          color: {
            dark: settings.fgColor,
            light: settings.transparentBg ? 'transparent' : settings.bgColor,
          },
          width: settings.size,
        };

        const dataUrl = await QRCode.toDataURL(data, options);
        const base64 = dataUrl.split(',')[1];
        zip.file(`${filename?.trim() || `qr-${i + 1}`}.png`, base64, { base64: true });
      } catch {}

      setBatchProgress(Math.round(((i + 1) / total) * 100));
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'qrcodes.zip';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    setBatchProgress(0);
    setCsvData('');
  };

  const inputClass = `w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent`;

  const renderInputForm = () => {
    switch (contentType) {
      case 'url':
        return (
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">URL</span>
              <input
                type="url"
                value={formData.url}
                onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                className={inputClass + ' mt-1'}
                placeholder="https://example.com"
              />
            </label>
          </div>
        );
      case 'text':
        return (
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Plain Text ({formData.text.length} characters)
              </span>
              <textarea
                value={formData.text}
                onChange={e => setFormData(prev => ({ ...prev, text: e.target.value }))}
                className={inputClass + ' mt-1'}
                rows={4}
                placeholder="Enter your text..."
              />
            </label>
          </div>
        );
      case 'email':
        return (
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</span>
              <input
                type="email"
                value={formData.email.to}
                onChange={e => setFormData(prev => ({ ...prev, email: { ...prev.email, to: e.target.value } }))}
                className={inputClass + ' mt-1'}
                placeholder="recipient@example.com"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subject</span>
              <input
                type="text"
                value={formData.email.subject}
                onChange={e => setFormData(prev => ({ ...prev, email: { ...prev.email, subject: e.target.value } }))}
                className={inputClass + ' mt-1'}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Body</span>
              <textarea
                value={formData.email.body}
                onChange={e => setFormData(prev => ({ ...prev, email: { ...prev.email, body: e.target.value } }))}
                className={inputClass + ' mt-1'}
                rows={3}
              />
            </label>
          </div>
        );
      case 'phone':
        return (
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</span>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className={inputClass + ' mt-1'}
                placeholder="+1234567890"
              />
            </label>
          </div>
        );
      case 'sms':
        return (
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</span>
              <input
                type="tel"
                value={formData.sms.phone}
                onChange={e => setFormData(prev => ({ ...prev, sms: { ...prev.sms, phone: e.target.value } }))}
                className={inputClass + ' mt-1'}
                placeholder="+1234567890"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Message</span>
              <textarea
                value={formData.sms.message}
                onChange={e => setFormData(prev => ({ ...prev, sms: { ...prev.sms, message: e.target.value } }))}
                className={inputClass + ' mt-1'}
                rows={3}
              />
            </label>
          </div>
        );
      case 'wifi':
        return (
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Network Name (SSID)</span>
              <input
                type="text"
                value={formData.wifi.ssid}
                onChange={e => setFormData(prev => ({ ...prev, wifi: { ...prev.wifi, ssid: e.target.value } }))}
                className={inputClass + ' mt-1'}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</span>
              <input
                type="password"
                value={formData.wifi.password}
                onChange={e => setFormData(prev => ({ ...prev, wifi: { ...prev.wifi, password: e.target.value } }))}
                className={inputClass + ' mt-1'}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Encryption</span>
              <select
                value={formData.wifi.encryption}
                onChange={e => setFormData(prev => ({ ...prev, wifi: { ...prev.wifi, encryption: e.target.value as 'WPA' | 'WEP' | 'None' } }))}
                className={inputClass + ' mt-1'}
              >
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="None">No Password</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.wifi.hidden}
                onChange={e => setFormData(prev => ({ ...prev, wifi: { ...prev.wifi, hidden: e.target.checked } }))}
                className="rounded text-indigo-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Hidden Network</span>
            </label>
          </div>
        );
      case 'vcard':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">First Name</span>
                <input
                  type="text"
                  value={formData.vcard.firstName}
                  onChange={e => setFormData(prev => ({ ...prev, vcard: { ...prev.vcard, firstName: e.target.value } }))}
                  className={inputClass + ' mt-1'}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</span>
                <input
                  type="text"
                  value={formData.vcard.lastName}
                  onChange={e => setFormData(prev => ({ ...prev, vcard: { ...prev.vcard, lastName: e.target.value } }))}
                  className={inputClass + ' mt-1'}
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</span>
              <input
                type="tel"
                value={formData.vcard.phone}
                onChange={e => setFormData(prev => ({ ...prev, vcard: { ...prev.vcard, phone: e.target.value } }))}
                className={inputClass + ' mt-1'}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</span>
              <input
                type="email"
                value={formData.vcard.email}
                onChange={e => setFormData(prev => ({ ...prev, vcard: { ...prev.vcard, email: e.target.value } }))}
                className={inputClass + ' mt-1'}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Organization</span>
              <input
                type="text"
                value={formData.vcard.org}
                onChange={e => setFormData(prev => ({ ...prev, vcard: { ...prev.vcard, org: e.target.value } }))}
                className={inputClass + ' mt-1'}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Website</span>
              <input
                type="url"
                value={formData.vcard.url}
                onChange={e => setFormData(prev => ({ ...prev, vcard: { ...prev.vcard, url: e.target.value } }))}
                className={inputClass + ' mt-1'}
              />
            </label>
          </div>
        );
      case 'location':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Latitude</span>
                <input
                  type="text"
                  value={formData.location.lat}
                  onChange={e => setFormData(prev => ({ ...prev, location: { ...prev.location, lat: e.target.value } }))}
                  className={inputClass + ' mt-1'}
                  placeholder="40.7128"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Longitude</span>
                <input
                  type="text"
                  value={formData.location.lng}
                  onChange={e => setFormData(prev => ({ ...prev, location: { ...prev.location, lng: e.target.value } }))}
                  className={inputClass + ' mt-1'}
                  placeholder="-74.0060"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Or Address</span>
              <input
                type="text"
                value={formData.location.address}
                onChange={e => setFormData(prev => ({ ...prev, location: { ...prev.location, address: e.target.value } }))}
                className={inputClass + ' mt-1'}
                placeholder="123 Main St, City"
              />
            </label>
          </div>
        );
      case 'calendar':
        return (
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Event Title</span>
              <input
                type="text"
                value={formData.calendar.title}
                onChange={e => setFormData(prev => ({ ...prev, calendar: { ...prev.calendar, title: e.target.value } }))}
                className={inputClass + ' mt-1'}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Start</span>
                <input
                  type="datetime-local"
                  value={formData.calendar.start}
                  onChange={e => setFormData(prev => ({ ...prev, calendar: { ...prev.calendar, start: e.target.value } }))}
                  className={inputClass + ' mt-1'}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">End</span>
                <input
                  type="datetime-local"
                  value={formData.calendar.end}
                  onChange={e => setFormData(prev => ({ ...prev, calendar: { ...prev.calendar, end: e.target.value } }))}
                  className={inputClass + ' mt-1'}
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</span>
              <input
                type="text"
                value={formData.calendar.location}
                onChange={e => setFormData(prev => ({ ...prev, calendar: { ...prev.calendar, location: e.target.value } }))}
                className={inputClass + ' mt-1'}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
              <textarea
                value={formData.calendar.description}
                onChange={e => setFormData(prev => ({ ...prev, calendar: { ...prev.calendar, description: e.target.value } }))}
                className={inputClass + ' mt-1'}
                rows={2}
              />
            </label>
          </div>
        );
      case 'batch':
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <label className="flex-1 px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center cursor-pointer hover:border-indigo-500 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Upload CSV</span>
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Or paste CSV data</span>
              <textarea
                value={csvData}
                onChange={e => setCsvData(e.target.value)}
                className={inputClass + ' mt-1 font-mono text-sm'}
                rows={6}
                placeholder="content,filename&#10;https://example1.com,site1&#10;https://example2.com,site2"
              />
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              First column: content, Second column: filename (optional)
            </p>
            {batchProgress > 0 && (
              <div className="space-y-1">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all"
                    style={{ width: `${batchProgress}%` }}
                  />
                </div>
                <p className="text-xs text-center text-gray-600 dark:text-gray-400">{batchProgress}%</p>
              </div>
            )}
            <button
              onClick={generateBatch}
              disabled={!csvData.trim()}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Generate & Download ZIP
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-white rounded grid grid-cols-3 grid-rows-3 gap-px p-1">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="bg-indigo-600 rounded-sm" />
                ))}
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">QR Generator</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Create custom QR codes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                setShowPresets(false);
              }}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              aria-label="History"
            >
              <History size={20} />
            </button>
            <button
              onClick={() => {
                setShowPresets(!showPresets);
                setShowHistory(false);
              }}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              aria-label="Presets"
            >
              <Bookmark size={20} />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              aria-label={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Panel - Input */}
          <div className="flex-1 space-y-4">
            {/* Content Type Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-2">
              <div className="flex flex-wrap gap-1">
                {contentTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setContentType(type.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      contentType === type.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {type.icon}
                    <span className="hidden sm:inline">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                {contentTypes.find(t => t.id === contentType)?.icon}
                {contentTypes.find(t => t.id === contentType)?.label} Content
              </h2>
              {renderInputForm()}
            </div>

            {/* Customization Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customization</h2>

              <div className="space-y-4">
                {/* Error Correction */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Error Correction
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {errorCorrectionLevels.map(level => (
                      <button
                        key={level.value}
                        onClick={() => setSettings(prev => ({ ...prev, errorCorrection: level.value as QRSettings['errorCorrection'] }))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          settings.errorCorrection === level.value
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Size: {settings.size}px
                  </label>
                  <input
                    type="range"
                    min={128}
                    max={1024}
                    value={settings.size}
                    onChange={e => setSettings(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Foreground
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.fgColor}
                        onChange={e => setSettings(prev => ({ ...prev, fgColor: e.target.value }))}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.fgColor}
                        onChange={e => setSettings(prev => ({ ...prev, fgColor: e.target.value }))}
                        className={inputClass + ' flex-1'}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Background
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.bgColor}
                        onChange={e => setSettings(prev => ({ ...prev, bgColor: e.target.value }))}
                        className="w-10 h-10 rounded cursor-pointer"
                        disabled={settings.transparentBg}
                      />
                      <input
                        type="text"
                        value={settings.bgColor}
                        onChange={e => setSettings(prev => ({ ...prev, bgColor: e.target.value }))}
                        className={inputClass + ' flex-1'}
                        disabled={settings.transparentBg}
                      />
                    </div>
                    <label className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        checked={settings.transparentBg}
                        onChange={e => setSettings(prev => ({ ...prev, transparentBg: e.target.checked }))}
                        className="rounded text-indigo-600"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Transparent</span>
                    </label>
                  </div>
                </div>

                {/* Margin */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Margin (quiet zone): {settings.margin} modules
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    value={settings.margin}
                    onChange={e => setSettings(prev => ({ ...prev, margin: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Dot Style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dot Style
                  </label>
                  <div className="flex gap-2">
                    {(['square', 'rounded', 'dots'] as const).map(style => (
                      <button
                        key={style}
                        onClick={() => setSettings(prev => ({ ...prev, dotStyle: style }))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          settings.dotStyle === style
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Center Logo (optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                      <input
                        type="file"
                        accept="image/png,image/svg+xml"
                        ref={fileInputRef}
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Upload Image</span>
                    </label>
                    {settings.logo && (
                      <button
                        onClick={() => setSettings(prev => ({ ...prev, logo: null }))}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {settings.logo && (
                    <div className="mt-3">
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Logo size: {settings.logoSize}%
                      </label>
                      <input
                        type="range"
                        min={10}
                        max={40}
                        value={settings.logoSize}
                        onChange={e => setSettings(prev => ({ ...prev, logoSize: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Preview & Export */}
          <div className="lg:w-96 space-y-4 lg:sticky lg:top-6 lg:self-start">
            {/* QR Preview */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Preview</h2>

              <div className="flex justify-center items-center min-h-[280px] bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                {isGenerating ? (
                  <div className="animate-pulse text-gray-400">Generating...</div>
                ) : qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Generated QR Code"
                    className={`max-w-full max-h-64 transition-all duration-300 ${isGenerating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}
                  />
                ) : contentType === 'batch' ? (
                  <p className="text-gray-400 text-sm text-center">Batch mode - use CSV input</p>
                ) : (
                  <p className="text-gray-400 text-sm text-center">Enter content to generate</p>
                )}
              </div>

              {/* Stats */}
              {qrDataUrl && (
                <div className="mt-3 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Modules: {moduleCount}x{moduleCount}</span>
                  <span>Capacity: ~{dataCapacity} chars</span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>

            {/* Export Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Export</h2>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportPNG}
                    disabled={!qrDataUrl}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Download size={16} />
                    PNG
                  </button>
                  <button
                    onClick={handleExportSVG}
                    disabled={!qrSvg}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Download size={16} />
                    SVG
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCopy}
                    disabled={!qrDataUrl}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={handlePrint}
                    disabled={!qrDataUrl}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Printer size={16} />
                    Print
                  </button>
                </div>
                <button
                  onClick={handleShareURL}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Share2 size={16} />
                  Copy Share Link
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <div className="flex gap-2">
                <button
                  onClick={startScanner}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Camera size={16} />
                  Test Scan
                </button>
                <button
                  onClick={() => setShowPresetModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Bookmark size={16} />
                  Save Preset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">History</h3>
                <div className="flex gap-2">
                  <button
                    onClick={clearHistory}
                    disabled={history.length === 0}
                    className="text-sm text-red-500 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto max-h-[60vh]">
                {history.length === 0 ? (
                  <p className="p-4 text-center text-gray-500 dark:text-gray-400">No history yet</p>
                ) : (
                  <div className="divide-y dark:divide-gray-700">
                    {history.map(item => (
                      <button
                        key={item.id}
                        onClick={() => restoreFromHistory(item)}
                        className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                            {contentTypes.find(t => t.id === item.contentType)?.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.label}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {item.content.slice(0, 40)}
                              {item.content.length > 40 && '...'}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {new Date(item.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Presets Panel */}
        {showPresets && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Presets</h3>
                <button
                  onClick={() => setShowPresets(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[60vh]">
                {presets.length === 0 ? (
                  <p className="p-4 text-center text-gray-500 dark:text-gray-400">No presets saved</p>
                ) : (
                  <div className="divide-y dark:divide-gray-700">
                    {presets.map(preset => (
                      <div key={preset.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => loadPreset(preset)}
                            className="flex-1 text-left"
                          >
                            <p className="font-medium text-gray-900 dark:text-white">{preset.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              EC: {preset.settings.errorCorrection} | Size: {preset.settings.size}px
                            </p>
                          </button>
                          <button
                            onClick={() => deletePreset(preset.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scan QR Code</h3>
                <button
                  onClick={stopScanner}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="relative aspect-square bg-black">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                />
                <canvas ref={scannerCanvasRef} className="hidden" />
                <div className="absolute inset-4 border-2 border-white/50 rounded-lg" />
              </div>
              <div className="p-4">
                {scannerResult ? (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Scanned successfully!</p>
                    <p className="text-xs text-green-600 dark:text-green-500 mt-1 break-all">{scannerResult}</p>
                  </div>
                ) : (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Point camera at a QR code
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Preset Modal */}
        {showPresetModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Save Preset</h3>
                <button
                  onClick={() => setShowPresetModal(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Preset Name</span>
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={e => setNewPresetName(e.target.value)}
                    className={inputClass + ' mt-1'}
                    placeholder="My preset"
                  />
                </label>
                <button
                  onClick={savePreset}
                  disabled={!newPresetName.trim()}
                  className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard Shortcut Hint */}
        <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm px-3 py-1.5">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Cmd</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Enter</kbd> to export
          </p>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

export default App;
