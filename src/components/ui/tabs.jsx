import React, { createContext, useContext, useState } from 'react';

const TabsContext = createContext();

const Tabs = ({ 
  defaultValue, 
  value, 
  onValueChange, 
  children, 
  className = '' 
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = value !== undefined ? value : internalValue;
  
  const handleValueChange = (newValue) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

const TabsList = ({ children, className = '' }) => {
  return (
    <div className={`flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg ${className}`}>
      {children}
    </div>
  );
};

const TabsTrigger = ({ 
  value, 
  children, 
  className = '', 
  ...props 
}) => {
  const { value: currentValue, onValueChange } = useContext(TabsContext);
  const isActive = currentValue === value;
  
  return (
    <button
      onClick={() => onValueChange(value)}
      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
        isActive 
          ? 'bg-white text-gray-900 shadow-sm' 
          : 'text-gray-600 hover:text-gray-900'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ 
  value, 
  children, 
  className = '' 
}) => {
  const { value: currentValue } = useContext(TabsContext);
  
  if (currentValue !== value) {
    return null;
  }
  
  return (
    <div className={className}>
      {children}
    </div>
  );
};

export { Tabs, TabsList, TabsTrigger, TabsContent }; 