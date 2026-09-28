import type { AuthService, ReceiptService } from "./service-types";
import { MOCK_ANALYSIS_RESULT, MOCK_RECEIPTS } from "./mock-data";
import type { Receipt } from "./vault-types";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const mockAuthService: AuthService = {
  async signInWithGoogle() {
    await wait(1100);
    return { name: "Alberto", email: "alberto@example.com", initials: "AM" };
  },
};

export const mockReceiptService: ReceiptService = {
  async fetchReceipts(): Promise<Receipt[]> {
    await wait(700);
    return MOCK_RECEIPTS;
  },
  async fetchReceipt(id: string): Promise<Receipt | undefined> {
    await wait(500);
    return MOCK_RECEIPTS.find((r) => r.id === id);
  },
  /** Simulated OCR — resolves with pre-filled data. */
  async analyseReceipt() {
    await wait(400);
    return MOCK_ANALYSIS_RESULT;
  },
  async saveReceipt(receipt: Receipt): Promise<Receipt> {
    await wait(900);
    return receipt;
  },
  async deleteReceipt(_id: string): Promise<void> {
    await wait(600);
  },
  /** Simulates the lazy download of the original receipt from cloud storage. */
  async fetchOriginalImages(receipt: Receipt) {
    await wait(1400);
    return receipt.images;
  },
};
