// src/services/balanceService.js - Real Backend Integration
import api from './api';
import authService from './authService'; // Assuming you have an auth service to get the current user

class BalanceService {
  /**
   * Get all balances for a group - who owes whom and how much
   * Connects to: GET /api/groups/{groupId}/balances
   */
  async getGroupBalances(groupId) {
  try {
    const response = await api.get(`/api/groups/${groupId}/balances`);
    console.log('🔍 Raw backend response for group balances:', response.data);
    console.log('🔍 Member balances array:', response.data.memberBalances);
    return response.data; // ApiResponse wrapper automatically unwrapped by api.js
  } catch (error) {
    console.error('Error fetching group balances:', error);
    throw error;
  }
}

  /**
   * Get net balance for each member (positive = owed money, negative = owes money)
   * This is an alias for getGroupBalances for compatibility with existing components
   */
  async getMemberBalances(groupId) {
  try {
    const groupBalances = await this.getGroupBalances(groupId);
    console.log('🔍 Group balances in getMemberBalances:', groupBalances);
    
    // Ensure memberBalances exists and is an array
    if (!groupBalances.memberBalances || !Array.isArray(groupBalances.memberBalances)) {
      console.error('❌ memberBalances is not an array:', groupBalances.memberBalances);
      return { data: [] };
    }
    
    // Transform the response to match the expected format for member balances
    const transformedData = groupBalances.memberBalances.map(member => {
      console.log('🔍 Transforming member:', member);
      return {
        user: {
          id: member.userId,
          username: member.username || `User ${member.userId}`,
          fullName: member.fullName || `User ${member.userId}`,
          email: null
        },
        netAmount: member.balance, // This should be the actual balance (positive/negative)
        status: member.status
      };
    });
    
    console.log('🔍 Transformed member balances:', transformedData);
    
    return {
      data: transformedData
    };
  } catch (error) {
    console.error('Error fetching member balances:', error);
    throw error;
  }
}

  /**
   * Record a settlement between members
   * Connects to: POST /api/groups/{groupId}/balances/settle
   */
  async recordSettlement(groupId, settlementData) {
    try {
      const response = await api.post(`/api/groups/${groupId}/balances/settle`, {
        fromUserId: settlementData.fromUserId,
        toUserId: settlementData.toUserId,
        amount: settlementData.amount,
        description: settlementData.description || 'Settlement payment'
      });
      return response.data;
    } catch (error) {
      console.error('Error recording settlement:', error);
      throw error;
    }
  }

  /**
   * Get payment history for a group
   * Note: This endpoint may need to be implemented in your backend
   */
  async getPaymentHistory(groupId) {
    try {
      // TODO: Implement payment history endpoint in backend
      console.warn('Payment history endpoint not yet implemented in backend');
      
      // Temporary mock response
      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        data: [] // Empty for now
      };
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  }

  /**
   * Get balance summary with totals and statistics
   * Calculated from group balances data
   */
  async getBalanceSummary(groupId) {
    try {
      const groupBalances = await this.getGroupBalances(groupId);
      const personalBalance = await this.getMyBalance(groupId);
      
      // Calculate summary from the real data
      const summary = {
        totalOwed: groupBalances.totalOwed || 0,
        totalOwing: groupBalances.totalOwes || 0,
        totalExpenses: 0, // This would need a separate expenses endpoint
        pendingSettlements: groupBalances.totalOwes || 0,
        settledMembers: groupBalances.memberBalances.filter(m => m.status === 'EVEN').length,
        myBalance: personalBalance.netBalance || 0,
        myStatus: personalBalance.status || 'EVEN'
      };
      
      return { data: summary };
    } catch (error) {
      console.error('Error fetching balance summary:', error);
      throw error;
    }
  }
  
  /**
   * Get the personal balance for the currently authenticated user
   */
  async getMyBalance(groupId) {
    try {
      // Get the current user's ID from your authentication service
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error("No authenticated user found.");
      }
      const currentUserId = currentUser.id;

      const groupData = await this.getGroupBalances(groupId);

      if (!groupData || !groupData.memberBalances) {
        throw new Error('Could not retrieve member balances for the group.');
      }

      const myBalanceData = groupData.memberBalances.find(
        member => member.userId === currentUserId
      );

      if (!myBalanceData) {
        // If user is not in the group or has no balance entry, return a default
        console.warn(`User with ID ${currentUserId} not found in group balances.`);
        return {
          netBalance: 0,
          status: 'EVEN',
          message: 'You are settled up.'
        };
      }
      
      return {
        netBalance: myBalanceData.balance || 0,
        status: myBalanceData.status || 'EVEN',
        message: this.getBalanceStatus(myBalanceData.balance).text
      };

    } catch (error) {
      console.error('Error fetching my personal balance:', error);
      throw error;
    }
  }
  
  /**
   * Get the optimized settlement plan for a group
   * Connects to: GET /api/groups/{groupId}/settlement-plan
   */
  async getSettlementPlan(groupId) {
    try {
      // This assumes your backend has an endpoint to generate a settlement plan
      const response = await api.get(`/api/groups/${groupId}/settlement-plan`);
      console.log('🔍 Settlement plan response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching settlement plan:', error);
      throw error;
    }
  }


  /**
   * Calculate balance breakdown by expense categories
   * Note: This would require an expenses endpoint that includes category information
   */
  async getBalanceBreakdown(groupId) {
    try {
      // TODO: Implement balance breakdown by category endpoint in backend
      console.warn('Balance breakdown by category not yet implemented in backend');
      
      // Temporary mock response
      await new Promise(resolve => setTimeout(resolve, 250));
      return {
        data: {
          categories: []
        }
      };
    } catch (error) {
      console.error('Error fetching balance breakdown:', error);
      throw error;
    }
  }

  // Utility functions for local calculations and formatting
  
  /**
   * Format currency for display
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  }

  /**
   * Get balance status with color and icon
   */
  getBalanceStatus(amount) {
    if (amount > 0) {
      return {
        text: `Owed ${this.formatCurrency(amount)}`,
        color: 'success',
        icon: 'arrow_upward',
        type: 'positive'
      };
    } else if (amount < 0) {
      return {
        text: `Owes ${this.formatCurrency(Math.abs(amount))}`,
        color: 'error', 
        icon: 'arrow_downward',
        type: 'negative'
      };
    } else {
      return {
        text: 'Settled up',
        color: 'info',
        icon: 'check_circle',
        type: 'neutral'
      };
    }
  }

  /**
   * Calculate total amount owed/owing for summary cards
   */
  calculateTotals(memberBalances) {
    const totals = {
      totalOwed: 0,
      totalOwing: 0,
      settledMembers: 0,
      totalMembers: memberBalances.length
    };

    memberBalances.forEach(member => {
      const amount = member.netAmount || member.balance || 0;
      if (amount > 0) {
        totals.totalOwed += amount;
      } else if (amount < 0) {
        totals.totalOwing += Math.abs(amount);
      } else {
        totals.settledMembers++;
      }
    });

    return totals;
  }

  /**
   * Validate payment data before submission
   */
  validatePayment(paymentData) {
    const errors = {};
    
    if (!paymentData.payerId) {
      errors.payerId = 'Payer is required';
    }
    
    if (!paymentData.receiverId) {
      errors.receiverId = 'Receiver is required';
    }

    if (paymentData.payerId === paymentData.receiverId) {
      errors.general = 'Payer and receiver cannot be the same person';
    }
    
    const amount = parseFloat(paymentData.amount);
    if (!amount || amount <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }

    if (amount > 10000) {
      errors.amount = 'Amount cannot exceed $10,000';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Get expense categories for balance breakdown with professional icons
   */
  getExpenseCategories() {
    return [
      { value: 'FOOD', label: 'Food & Dining', icon: 'restaurant', color: '#FF6B6B' },
      { value: 'TRANSPORT', label: 'Transportation', icon: 'directions_car', color: '#4ECDC4' },
      { value: 'ACCOMMODATION', label: 'Accommodation', icon: 'home', color: '#45B7D1' },
      { value: 'ENTERTAINMENT', label: 'Entertainment', icon: 'movie', color: '#96CEB4' },
      { value: 'SHOPPING', label: 'Shopping', icon: 'shopping_bag', color: '#FFEAA7' },
      { value: 'UTILITIES', label: 'Utilities', icon: 'electrical_services', color: '#DDA0DD' },
      { value: 'HEALTHCARE', label: 'Healthcare', icon: 'local_hospital', color: '#98D8C8' },
      { value: 'EDUCATION', label: 'Education', icon: 'school', color: '#F7DC6F' },
      { value: 'BUSINESS', label: 'Business', icon: 'business_center', color: '#BB8FCE' },
      { value: 'OTHER', label: 'Other', icon: 'category', color: '#AED6F1' }
    ];
  }

  /**
   * Calculate settlement efficiency - Fixed Implementation
   * Compares direct transactions (creditors × debtors) vs optimized settlement plan
   */
  calculateSettlementEfficiency(settlementPlan, memberBalances) {
    console.log('🔍 Settlement Efficiency Calculation Started');
    console.log('📊 Settlement Plan:', settlementPlan);
    console.log('👥 Member Balances:', memberBalances);
    
    // Handle different data structures that might be passed
    let balancesArray = memberBalances;
    
    // If memberBalances is wrapped in a data property
    if (memberBalances && memberBalances.data && Array.isArray(memberBalances.data)) {
      balancesArray = memberBalances.data;
    }
    
    // If memberBalances has memberBalances property (from backend response)
    if (memberBalances && memberBalances.memberBalances && Array.isArray(memberBalances.memberBalances)) {
      balancesArray = memberBalances.memberBalances;
    }
    
    // Ensure we have a valid array
    if (!Array.isArray(balancesArray)) {
      console.error('❌ Invalid member balances data structure:', memberBalances);
      return {
        directTransactions: 0,
        optimizedTransactions: 0,
        efficiency: 0,
        creditorsCount: 0,
        debtorsCount: 0,
        error: 'Invalid member balances data'
      };
    }
    
    console.log('📋 Processing balances array:', balancesArray);
    
    // Count creditors (positive balances) and debtors (negative balances)
    const creditors = balancesArray.filter(member => {
      // Handle different balance property names
      const amount = member.netAmount || member.balance || 0;
      const isCreditor = amount > 0;
      console.log(`👤 ${member.fullName || member.username || 'Unknown'}: ${amount} (${isCreditor ? 'CREDITOR' : 'not creditor'})`);
      return isCreditor;
    });
    
    const debtors = balancesArray.filter(member => {
      // Handle different balance property names
      const amount = member.netAmount || member.balance || 0;
      const isDebtor = amount < 0;
      console.log(`👤 ${member.fullName || member.username || 'Unknown'}: ${amount} (${isDebtor ? 'DEBTOR' : 'not debtor'})`);
      return isDebtor;
    });
    
    console.log(`💰 Found ${creditors.length} creditors and ${debtors.length} debtors`);
    
    // Calculate maximum possible transactions (each debtor pays each creditor)
    const directTransactions = creditors.length * debtors.length;
    
    // Get optimized transaction count from settlement plan
    let optimizedTransactions = 0;
    
    if (settlementPlan) {
      // Try different property names for transaction count
      optimizedTransactions = settlementPlan.totalTransactions || 
                             settlementPlan.transactionCount ||
                             (settlementPlan.transactions ? settlementPlan.transactions.length : 0) ||
                             0;
    }
    
    console.log(`📈 Direct transactions: ${directTransactions}, Optimized: ${optimizedTransactions}`);
    
    // Calculate efficiency percentage
    let efficiency = 0;
    if (directTransactions > 0 && optimizedTransactions < directTransactions) {
      efficiency = Math.round(((directTransactions - optimizedTransactions) / directTransactions) * 100);
    }
    
    const result = {
      directTransactions,
      optimizedTransactions,
      efficiency: Math.max(0, efficiency),
      creditorsCount: creditors.length,
      debtorsCount: debtors.length,
      creditorNames: creditors.map(c => c.fullName || c.username),
      debtorNames: debtors.map(d => d.fullName || d.username)
    };
    
    console.log('✅ Settlement Efficiency Result:', result);
    
    return result;
  }

  /**
   * Transform settlement plan transactions for display
   */
  formatSettlementTransactions(settlementPlan) {
    if (!settlementPlan.transactions || settlementPlan.transactions.length === 0) {
      return [];
    }

    return settlementPlan.transactions.map(transaction => ({
      from: transaction.fromUserId,
      to: transaction.toUserId,
      amount: transaction.amount,
      description: transaction.description || 'Settlement payment'
    }));
  }

  /**
   * Get user-friendly balance summary for current user
   */
  async getMyBalanceSummary(groupId) {
    try {
      const personalBalance = await this.getMyBalance(groupId);
      const groupBalances = await this.getGroupBalances(groupId);
      
      return {
        youOwe: personalBalance.netBalance < 0 ? Math.abs(personalBalance.netBalance) : 0,
        youAreOwed: personalBalance.netBalance > 0 ? personalBalance.netBalance : 0,
        totalBalance: personalBalance.netBalance,
        status: personalBalance.status,
        message: personalBalance.message,
        isBalanced: groupBalances.isBalanced
      };
    } catch (error) {
      console.error('Error fetching my balance summary:', error);
      throw error;
    }
  }
}

const balanceService = new BalanceService();
export default balanceService;