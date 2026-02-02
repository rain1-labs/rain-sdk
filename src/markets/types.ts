export type MarketStatus = 'Live' | 'New' | 'WaitingForResult' | 'UnderDispute' | 'UnderAppeal' | 'ClosingSoon' | 'InReview' | 'InEvaluation' | 'Closed' | 'Trading';

export type MarketSortBy =
    | 'totalVolume'
    | 'createdAt'
    | 'endTime';

export interface GetMarketsParams {
    limit?: number;
    offset?: number;
    sortBy?: MarketSortBy;
    status?: MarketStatus;
}

export interface Market {
    id: string;
    title: string;
    totalVolume: string;
    status: MarketStatus;
    // add more fields as your API returns
}
