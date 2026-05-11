export interface BillSplitParticipant {
  id: string;
  name: string;
  amount: number;
  paid: boolean;
}

export interface BillSplit {
  id: string;
  title: string;
  total: number;
  participants: BillSplitParticipant[];
  createdAt: string;
  updatedAt: string;
}

export interface AddBillSplitInput {
  title: string;
  total: number;
  participantNames: string[];
}
