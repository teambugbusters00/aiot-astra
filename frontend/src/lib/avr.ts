/**
 * avr8js browser runner utility
 * Wraps the avr8js library for use in AIoT Studio simulation
 *
 * Install: npm install avr8js
 * Docs: https://github.com/wokwi/avr8js
 */

export type PinListener = (pin: number, value: boolean) => void;
export type SerialListener = (char: string) => void;

export interface AVRRunnerOptions {
  onPinChange?: PinListener;
  onSerial?: SerialListener;
  clockFreq?: number;
}

export class AVRRunner {
  private runner: any = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private options: AVRRunnerOptions;
  private running = false;

  constructor(options: AVRRunnerOptions = {}) {
    this.options = options;
  }

  /**
   * Load Intel HEX from base64 string and start simulation
   */
  async loadAndRun(hexBase64: string): Promise<boolean> {
    try {
      // Dynamic import so build works without avr8js installed
      const { AVRRunner: CoreRunner, loadHex } = await import('avr8js');

      const hexStr = atob(hexBase64);
      const program = loadHex(hexStr);

      this.runner = new CoreRunner(program);

      // GPIO listeners — PortB (digital 8-13), PortD (digital 0-7)
      this.runner.portB.addListener((value: number) => {
        for (let bit = 0; bit < 8; bit++) {
          const pin = bit + 8; // PB0=D8 … PB5=D13
          const high = !!(value & (1 << bit));
          this.options.onPinChange?.(pin, high);
        }
      });

      this.runner.portD.addListener((value: number) => {
        for (let bit = 2; bit < 8; bit++) {
          // PD2=D2 … PD7=D7
          const high = !!(value & (1 << bit));
          this.options.onPinChange?.(bit, high);
        }
      });

      // USART serial output
      this.runner.usart.onByteTransmit = (byte: number) => {
        this.options.onSerial?.(String.fromCharCode(byte));
      };

      this.startLoop();
      return true;
    } catch (err) {
      console.warn('avr8js not installed or load failed:', err);
      // Fallback: simulate demo pin toggling
      this.startDemoLoop();
      return false;
    }
  }

  /**
   * Inject analog value to ADC (0-1023)
   */
  setADC(channel: number, value: number) {
    if (this.runner?.adc) {
      this.runner.adc.channelValues[channel] = value;
    }
  }

  /**
   * Inject digital pin input
   */
  setPin(pin: number, value: boolean) {
    if (!this.runner) return;
    // Map Arduino pin to AVR port/bit
    if (pin >= 2 && pin <= 7) {
      // PortD
      const bit = pin;
      if (value) {
        this.runner.portD.setPin(bit, true);
      } else {
        this.runner.portD.setPin(bit, false);
      }
    } else if (pin >= 8 && pin <= 13) {
      // PortB
      const bit = pin - 8;
      this.runner.portB.setPin(bit, value);
    }
  }

  /**
   * Send serial byte to MCU
   */
  sendSerial(char: string) {
    if (this.runner?.usart) {
      this.runner.usart.onByteSent?.(char.charCodeAt(0));
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
  }

  get isRunning() { return this.running; }

  /** Real avr8js clock loop — ~3M instructions/sec at 60fps */
  private startLoop() {
    this.running = true;
    const CYCLES_PER_FRAME = 16_000_000 / 60; // 16MHz / 60fps
    this.timer = setInterval(() => {
      if (!this.runner) return;
      for (let i = 0; i < CYCLES_PER_FRAME; i++) {
        this.runner.executeInstruction();
      }
    }, 16);
  }

  /** Demo loop when avr8js not available — toggles pin 13 every 500ms */
  private startDemoLoop() {
    this.running = true;
    let state = false;
    this.timer = setInterval(() => {
      state = !state;
      this.options.onPinChange?.(13, state);
      if (state) {
        this.options.onSerial?.('L');
        this.options.onSerial?.('E');
        this.options.onSerial?.('D');
        this.options.onSerial?.(':');
        this.options.onSerial?.(state ? '1' : '0');
        this.options.onSerial?.('\n');
      }
    }, 500);
  }
}

/** Parse Intel HEX string into Uint8Array */
export function parseHex(hexStr: string): Uint8Array {
  const buf = new Uint8Array(32 * 1024); // 32KB flash
  const lines = hexStr.split('\n');
  for (const line of lines) {
    if (!line.startsWith(':')) continue;
    const byteCount = parseInt(line.slice(1, 3), 16);
    const addr      = parseInt(line.slice(3, 7), 16);
    const type      = parseInt(line.slice(7, 9), 16);
    if (type !== 0) continue; // only data records
    for (let i = 0; i < byteCount; i++) {
      buf[addr + i] = parseInt(line.slice(9 + i * 2, 11 + i * 2), 16);
    }
  }
  return buf;
}
