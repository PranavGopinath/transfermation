'use client';

import { useState } from 'react';

interface Transfer {
  id: string;
  playerName: string;
  fromTeam: string;
  toTeam: string;
  transferValue: string;
}

export default function Home() {
  const [playerSearch, setPlayerSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [transfers, setTransfers] = useState<Transfer[]>([
    {
      id: '1',
      playerName: 'Jude Bellingham',
      fromTeam: 'Borussia Dortmund',
      toTeam: 'Real Madrid',
      transferValue: '€103.5M',
    },
    {
      id: '2',
      playerName: 'Declan Rice',
      fromTeam: 'West Ham United',
      toTeam: 'Arsenal',
      transferValue: '€116.6M',
    },
    {
      id: '3',
      playerName: 'Moises Caicedo',
      fromTeam: 'Brighton & Hove Albion',
      toTeam: 'Chelsea',
      transferValue: '€116M',
    }
  ]);

  const filteredTransfers = transfers.filter(transfer => {
    const matchesPlayer = transfer.playerName.toLowerCase().includes(playerSearch.toLowerCase());
    const matchesTeam = transfer.toTeam.toLowerCase().includes(teamSearch.toLowerCase());
    return matchesPlayer && matchesTeam;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Transfermation</h1>
          <p className="text-gray-600">Discover the predicted impact of your team's dream signings</p>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player Search */}
            <div>
              <label htmlFor="playerSearch" className="block text-sm font-medium text-gray-700 mb-2">
                Search by Player Name
              </label>
              <input
                type="text"
                id="playerSearch"
                placeholder="Enter player name ...."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  teamSearch ? "text-slate-900" : "text-slate-500"
                }`}
              />

            </div>

            {/* Team Search */}
            <div>
              <label htmlFor="teamSearch" className="block text-sm font-medium text-gray-700 mb-2">
                Search by Destination Team
              </label>
                <input
                  type="text"
                  id="teamSearch"
                  placeholder="Enter team name..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    teamSearch ? "text-slate-900" : "text-slate-500"
                  }`}
                />  
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Transfer Results</h2>
            <span className="text-sm text-gray-500">
              {filteredTransfers.length} transfer{filteredTransfers.length !== 1 ? 's' : ''} found
            </span>
          </div>

          {filteredTransfers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transfers found matching your search criteria
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {transfer.playerName}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-600 space-y-1 sm:space-y-0 sm:space-x-4">
                        <span className="flex items-center">
                          <span className="text-red-500 mr-2">→</span>
                          From: {transfer.fromTeam}
                        </span>
                        <span className="flex items-center">
                          <span className="text-green-500 mr-2">→</span>
                          To: {transfer.toTeam}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 md:mt-0 md:text-right">
                      <div className="text-lg font-bold text-blue-600 mb-1">
                        {transfer.transferValue}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
