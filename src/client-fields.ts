// Client form metadata snapshot, verified 9 October 2026. No record data.
export const customerFields = [
  {
    link_name: "Business_Name",
    display_name: "Business Name",
    type: 1,
  },
  {
    link_name: "Business_Name_Upper",
    display_name: "Business Name (Upper)",
    type: 1,
  },
  {
    link_name: "ABN",
    display_name: "ABN",
    type: 1,
  },
  {
    link_name: "Priority",
    display_name: "Priority",
    type: 12,
    choices: [
      {
        value: "Tier 3",
        key: "Tier 3",
      },
      {
        value: "Tier 2",
        key: "Tier 2",
      },
      {
        value: "Tier 1",
        key: "Tier 1",
      },
    ],
  },
  {
    link_name: "Customer_Type",
    display_name: "Customer Type",
    type: 14,
    is_lookup_field: true,
  },
  {
    link_name: "Distributors",
    display_name: "Distributors",
    type: 14,
    is_lookup_field: true,
  },
  {
    link_name: "Service_Ticket_Default",
    display_name: "Service Ticket Default",
    type: 14,
    is_lookup_field: true,
  },
  {
    link_name: "Country",
    display_name: "Country",
    type: 12,
    is_lookup_field: true,
  },
  {
    link_name: "State",
    display_name: "State",
    type: 12,
    choices: [
      {
        value: "NSW",
        key: "NSW",
      },
      {
        value: "VIC",
        key: "VIC",
      },
      {
        value: "QLD",
        key: "QLD",
      },
      {
        value: "SA",
        key: "SA",
      },
      {
        value: "WA",
        key: "WA",
      },
      {
        value: "TAS",
        key: "TAS",
      },
      {
        value: "ACT",
        key: "ACT",
      },
      {
        value: "NT",
        key: "NT",
      },
    ],
  },
  {
    link_name: "Office_Address",
    display_name: "Office Address",
    type: 1,
  },
  {
    link_name: "Postcode",
    display_name: "Postcode",
    type: 1,
  },
  {
    link_name: "Contact_Name",
    display_name: "Contact Name",
    type: 1,
  },
  {
    link_name: "Email",
    display_name: "Email",
    type: 3,
  },
  {
    link_name: "Phone_Number",
    display_name: "Phone",
    type: 27,
  },
  {
    link_name: "Note",
    display_name: "Note",
    type: 2,
  },
  {
    link_name: "Main_Product_Used",
    display_name: "Main Product Used",
    type: 12,
    is_lookup_field: true,
  },
  {
    link_name: "Follow_Up_Frequency",
    display_name: "Follow-Up Frequency (per N days)",
    type: 5,
  },
  {
    link_name: "Last_Meeting",
    display_name: "Last Meeting",
    type: 12,
    is_lookup_field: true,
  },
  {
    link_name: "Installs_Per_Month",
    display_name: "Installs Per Month",
    type: 5,
  },
  {
    link_name: "Switch_to_Sungrow",
    display_name: "% Switch to Sungrow",
    type: 7,
  },
  {
    link_name: "Used_Sungrow_Before",
    display_name: "Used Sungrow Before?",
    type: 13,
    choices: [
      {
        value: "Yes",
        key: "Yes",
      },
      {
        value: "No",
        key: "No",
      },
    ],
  },
  {
    link_name: "PCS_Capacity",
    display_name: "PCS Capacity (MV)",
    type: 6,
  },
  {
    link_name: "BESS_Capacity",
    display_name: "BESS Capacity (MVh)",
    type: 6,
  },
  {
    link_name: "Inverter_Capacity",
    display_name: "Inverter Capacity",
    type: 6,
  },
  {
    link_name: "Meeting_Note",
    display_name: "Meeting Note",
    type: 21,
    fields: [
      {
        link_name: "Date_field",
        display_name: "Date",
        type: 10,
      },
      {
        link_name: "Topic_Introduced",
        display_name: "Topic Introduced",
        type: 1,
      },
      {
        link_name: "Market_Feedback_and_Expectations",
        display_name: "Market Feedback and Expectations",
        type: 2,
      },
      {
        link_name: "Opportunities_Strategies_to_Increase_Sungrow_Sales",
        display_name: "Opportunities / Strategies to Increase Sungrow Sales",
        type: 2,
      },
      {
        link_name: "Follow_up_Actions",
        display_name: "Follow-up Actions",
        type: 2,
      },
      {
        link_name: "Current_Challenges",
        display_name: "Current Challenges",
        type: 2,
      },
      {
        link_name: "Solutions",
        display_name: "Solutions",
        type: 2,
      },
      {
        link_name: "To_Do",
        display_name: "To-Do",
        type: 14,
        is_lookup_field: true,
      },
      {
        link_name: "Is_Subform",
        display_name: "Is Subform",
        type: 16,
      },
    ],
  },
  {
    link_name: "Staff",
    display_name: "Staff",
    type: 21,
    fields: [
      {
        link_name: "Name",
        display_name: "Name",
        type: 1,
      },
      {
        link_name: "Contact_Number",
        display_name: "Contact Number",
        type: 1,
      },
      {
        link_name: "Contact_Number_Encrypted",
        display_name: "Contact Number",
        type: 1,
      },
      {
        link_name: "Contact_Email",
        display_name: "Contact Email",
        type: 1,
      },
      {
        link_name: "Contact_Email_Encrypted",
        display_name: "Contact Email",
        type: 1,
      },
      {
        link_name: "Role",
        display_name: "Role",
        type: 12,
        choices: [
          {
            value: "Project Manager",
            key: "Project Manager",
          },
        ],
      },
      {
        link_name: "Status",
        display_name: "Status",
        type: 12,
        choices: [
          {
            value: "In Role",
            key: "In Role",
          },
          {
            value: "Leaved",
            key: "Leaved",
          },
        ],
      },
    ],
  },
  {
    link_name: "Site",
    display_name: "Site",
    type: 21,
    fields: [
      {
        link_name: "Site_Address",
        display_name: "Site Address",
        type: 1,
      },
      {
        link_name: "Contact_Name",
        display_name: "Contact Name",
        type: 1,
      },
      {
        link_name: "Contact_Number",
        display_name: "Contact Number",
        type: 1,
      },
      {
        link_name: "Contact_Email",
        display_name: "Contact Email",
        type: 1,
      },
      {
        link_name: "Client_Name",
        display_name: "Client",
        type: 1,
      },
      {
        link_name: "Site_Address_CMP",
        display_name: "Site Address (CMP)",
        type: 1,
      },
    ],
  },
  {
    link_name: "Leads",
    display_name: "Leads",
    type: 21,
    fields: [
      {
        link_name: "Lead_No",
        display_name: "Lead No.",
        type: 1,
      },
      {
        link_name: "Country",
        display_name: "Country",
        type: 12,
        is_lookup_field: true,
      },
      {
        link_name: "State",
        display_name: "State *",
        type: 12,
        choices: [
          {
            value: "State not available",
            key: "State not available",
          },
        ],
      },
      {
        link_name: "Contact_Name",
        display_name: "Contact Name",
        type: 1,
      },
      {
        link_name: "Phone_Number",
        display_name: "Phone",
        type: 27,
      },
      {
        link_name: "Email",
        display_name: "Email",
        type: 3,
      },
      {
        link_name: "Priority",
        display_name: "Priority",
        type: 12,
        choices: [
          {
            value: "Tier 3",
            key: "Tier 3",
          },
          {
            value: "Tier 2",
            key: "Tier 2",
          },
          {
            value: "Tier 1",
            key: "Tier 1",
          },
        ],
      },
      {
        link_name: "Sales",
        display_name: "Sales",
        type: 12,
        is_lookup_field: true,
      },
      {
        link_name: "Status",
        display_name: "Status",
        type: 12,
        choices: [
          {
            value: "Proposal",
            key: "Proposal",
          },
          {
            value: "Quotation",
            key: "Quotation",
          },
          {
            value: "Project Design",
            key: "Project Design",
          },
          {
            value: "Feasibility",
            key: "Feasibility",
          },
          {
            value: "CO",
            key: "CO",
          },
        ],
      },
      {
        link_name: "Project_Info",
        display_name: "Project Info",
        type: 2,
      },
      {
        link_name: "Note",
        display_name: "Note",
        type: 2,
      },
      {
        link_name: "Inverter_kW",
        display_name: "Inverter (kW)",
        type: 6,
      },
      {
        link_name: "Battery_kWh",
        display_name: "Battery (kWh)",
        type: 6,
      },
      {
        link_name: "Last_Reach_Out",
        display_name: "Last Reach Out",
        type: 10,
      },
      {
        link_name: "Auto_Number",
        display_name: "Auto Number",
        type: 9,
      },
    ],
  },
  {
    link_name: "Project",
    display_name: "Project",
    type: 21,
    fields: [
      {
        link_name: "Project_ID",
        display_name: "Project ID",
        type: 1,
      },
      {
        link_name: "Project_Name",
        display_name: "Project Name",
        type: 1,
      },
      {
        link_name: "Project_Type",
        display_name: "Project Type *",
        type: 12,
        choices: [
          {
            value: "Sub 5MW PV&Storage",
            key: "Sub 5MW PV&Storage",
          },
          {
            value: "Utility",
            key: "Utility",
          },
          {
            value: "C&I - Project Team",
            key: "C&I - Project Team",
          },
          {
            value: "C&I - Direct Sales",
            key: "C&I - Direct Sales",
          },
          {
            value: "C&I - Channel",
            key: "C&I - Channel",
          },
        ],
      },
      {
        link_name: "Scenario",
        display_name: "Scenario *",
        type: 14,
        choices: [
          {
            value: "Grid-GFM",
            key: "Grid-GFM",
          },
          {
            value: "Grid-GFL",
            key: "Grid-GFL",
          },
          {
            value: "Off-Grid",
            key: "Off-Grid",
          },
          {
            value: "FCAS",
            key: "FCAS",
          },
          {
            value: "with Genset",
            key: "with Genset",
          },
          {
            value: "Other Customisation",
            key: "Other Customisation",
          },
        ],
      },
      {
        link_name: "Coupling_Type",
        display_name: "Coupling Type *",
        type: 12,
        choices: [
          {
            value: "AC Coupling",
            key: "AC Coupling",
          },
          {
            value: "DC Coupling",
            key: "DC Coupling",
          },
        ],
      },
      {
        link_name: "Product_Line",
        display_name: "Product Line",
        type: 12,
        choices: [
          {
            value: "PV",
            key: "PV",
          },
          {
            value: "Storage",
            key: "Storage",
          },
          {
            value: "PV & Storage",
            key: "PV & Storage",
          },
          {
            value: "Residential",
            key: "Residential",
          },
        ],
      },
      {
        link_name: "Status",
        display_name: "Status",
        type: 12,
        choices: [
          {
            value: "Pre-Sale Consulting & HL Design",
            key: "Pre-Sale Consulting & HL Design",
          },
          {
            value: "Site Design",
            key: "Site Design",
          },
          {
            value: "Manufacturing",
            key: "Manufacturing",
          },
          {
            value: "Installing",
            key: "Installing",
          },
          {
            value: "Commissioning",
            key: "Commissioning",
          },
          {
            value: "HP Testing",
            key: "HP Testing",
          },
          {
            value: "O&M",
            key: "O&M",
          },
          {
            value: "Out of Warranty",
            key: "Out of Warranty",
          },
        ],
      },
      {
        link_name: "Country",
        display_name: "Country *",
        type: 12,
        is_lookup_field: true,
      },
      {
        link_name: "State_chosen",
        display_name: "State",
        type: 12,
        choices: [
          {
            value: "NSW",
            key: "NSW",
          },
          {
            value: "QLD",
            key: "QLD",
          },
          {
            value: "SA",
            key: "SA",
          },
          {
            value: "WA",
            key: "WA",
          },
          {
            value: "VIC",
            key: "VIC",
          },
          {
            value: "TAS",
            key: "TAS",
          },
          {
            value: "NT",
            key: "NT",
          },
          {
            value: "ACT",
            key: "ACT",
          },
        ],
      },
      {
        link_name: "State",
        display_name: "State",
        type: 1,
      },
      {
        link_name: "Project_Manager",
        display_name: "Project Manager",
        type: 12,
        is_lookup_field: true,
      },
      {
        link_name: "Sales",
        display_name: "Sales",
        type: 12,
        is_lookup_field: true,
      },
      {
        link_name: "Distributor",
        display_name: "Distributor",
        type: 12,
        is_lookup_field: true,
      },
      {
        link_name: "Business_Name",
        display_name: "Business Name",
        type: 1,
      },
      {
        link_name: "ABN",
        display_name: "ABN",
        type: 1,
      },
      {
        link_name: "C4",
        display_name: "C4",
        type: 14,
        is_lookup_field: true,
      },
      {
        link_name: "Site",
        display_name: "Site",
        type: 12,
        is_lookup_field: true,
      },
      {
        link_name: "Stakeholders",
        display_name: "Stakeholders",
        type: 1,
      },
      {
        link_name: "PCS_Capacity",
        display_name: "PCS Capacity (MW)",
        type: 6,
      },
      {
        link_name: "BESS_Capacity",
        display_name: "BESS Capacity (MVh)",
        type: 6,
      },
      {
        link_name: "Inverter_Capacity",
        display_name: "Inverter Capacity (MW)",
        type: 6,
      },
      {
        link_name: "BX_Code",
        display_name: "BX Code",
        type: 1,
      },
      {
        link_name: "Project_Notes",
        display_name: "Project Notes",
        type: 2,
      },
      {
        link_name: "EXW_Factory_Date",
        display_name: "EXW Factory Date",
        type: 10,
      },
      {
        link_name: "Estimated_Commission_Date",
        display_name: "Estimated Commission Date",
        type: 10,
      },
      {
        link_name: "Commission_Complete_Date",
        display_name: "Commission Complete Date",
        type: 10,
      },
      {
        link_name: "Shipping_Complete_Date",
        display_name: "Shipping Complete Date *",
        type: 10,
      },
      {
        link_name: "Planning_Shipping_Complete_Date",
        display_name: "Planning Shipping Complete Date *",
        type: 10,
      },
      {
        link_name: "Shipping_Delay",
        display_name: "Shipping Delay (Day)",
        type: 5,
      },
      {
        link_name: "Installation_Start_Date",
        display_name: "Installation Start Date *",
        type: 10,
      },
      {
        link_name: "Planning_Installation_Complete_Date",
        display_name: "Planning Installation Complete Date *",
        type: 10,
      },
      {
        link_name: "Installation_Complete_Date",
        display_name: "Installation Complete Date",
        type: 10,
      },
      {
        link_name: "Installation_Delay",
        display_name: "Installation Delay (Day)",
        type: 5,
      },
      {
        link_name: "Commission_Start_Date",
        display_name: "Commission Start Date *",
        type: 10,
      },
      {
        link_name: "Commission_Delay",
        display_name: "Commission Delay (Day)",
        type: 5,
      },
      {
        link_name: "Planning_Commission_Complete_Date",
        display_name: "Planning Commission Complete Date *",
        type: 10,
      },
      {
        link_name: "HP_Testing_Start_Date",
        display_name: "HP Testing Start Date *",
        type: 10,
      },
      {
        link_name: "Planning_HP_Testing_Complete_Date",
        display_name: "Planning HP Testing Complete Date *",
        type: 10,
      },
      {
        link_name: "HP_Testing_Complete_Date",
        display_name: "HP Testing Complete Date",
        type: 10,
      },
      {
        link_name: "HP_Testing_Delay",
        display_name: "HP Testing Delay (Day)",
        type: 5,
      },
      {
        link_name: "Warranty_Commencement_Date",
        display_name: "Warranty Commencement Date",
        type: 10,
      },
      {
        link_name: "Warranty_End_Date",
        display_name: "Warranty End Date",
        type: 10,
      },
      {
        link_name: "Show_BOM",
        display_name: "Show BOM",
        type: 16,
      },
      {
        link_name: "BOM_Display",
        display_name: "BOM Display",
        type: 13,
        choices: [
          {
            value: "Detail View",
            key: "Detail View",
          },
          {
            value: "Stack View",
            key: "Stack View",
          },
          {
            value: "Batch Input",
            key: "Batch Input",
          },
        ],
      },
      {
        link_name: "plain_BOM",
        display_name: "plain_BOM",
        type: 24,
      },
      {
        link_name: "Batch_SN_Input",
        display_name: "Batch SN Input",
        type: 2,
      },
      {
        link_name: "Issue_Counter",
        display_name: "Issue Counter",
        type: 5,
      },
      {
        link_name: "Auto_Number",
        display_name: "Auto Number",
        type: 9,
      },
      {
        link_name: "Trashed",
        display_name: "Trashed",
        type: 16,
      },
      {
        link_name: "Added_By",
        display_name: "Added By",
        type: 12,
        is_lookup_field: true,
      },
      {
        link_name: "Is_Subform",
        display_name: "Is Subform",
        type: 16,
      },
    ],
  },
  {
    link_name: "C4",
    display_name: "C4",
    type: 21,
    fields: [
      {
        link_name: "C4_Number",
        display_name: "C4 Number *",
        type: 1,
      },
      {
        link_name: "ERP_Number",
        display_name: "ERP Number",
        type: 1,
      },
      {
        link_name: "C4_Contact_Name",
        display_name: "C4 Contact Name",
        type: 1,
      },
      {
        link_name: "C4_Type",
        display_name: "C4 Type",
        type: 12,
        choices: [
          {
            value: "Product Only",
            key: "Product Only",
          },
          {
            value: "Service Only",
            key: "Service Only",
          },
          {
            value: "Product + Service",
            key: "Product + Service",
          },
          {
            value: "Product + OM",
            key: "Product + OM",
          },
        ],
      },
      {
        link_name: "Direct_Sales_Order_Number",
        display_name: "Direct Sales Order Number",
        type: 1,
      },
      {
        link_name: "SPO",
        display_name: "SPO",
        type: 1,
      },
      {
        link_name: "MIGO",
        display_name: "MIGO",
        type: 1,
      },
      {
        link_name: "Delivery",
        display_name: "Delivery VL01N+VL02N",
        type: 1,
      },
      {
        link_name: "Project",
        display_name: "Project",
        type: 14,
        is_lookup_field: true,
      },
      {
        link_name: "Client_Business",
        display_name: "Client Business",
        type: 1,
      },
      {
        link_name: "ABN",
        display_name: "ABN",
        type: 1,
      },
      {
        link_name: "Linked_CSR",
        display_name: "Linked CSR",
        type: 2,
      },
      {
        link_name: "Show_BOM",
        display_name: "Show BOM",
        type: 16,
      },
      {
        link_name: "BOM_Display",
        display_name: "BOM Display",
        type: 13,
        choices: [
          {
            value: "Detail View",
            key: "Detail View",
          },
          {
            value: "Stack View",
            key: "Stack View",
          },
        ],
      },
      {
        link_name: "plain_BOM",
        display_name: "",
        type: 24,
      },
      {
        link_name: "Is_Subform",
        display_name: "Is Subform",
        type: 16,
      },
    ],
  },
  {
    link_name: "PO",
    display_name: "PO",
    type: 21,
    fields: [
      {
        link_name: "PO_Number",
        display_name: "PO Number",
        type: 1,
      },
      {
        link_name: "C4_Number",
        display_name: "C4 Number",
        type: 1,
      },
      {
        link_name: "Date_field",
        display_name: "Date",
        type: 10,
      },
      {
        link_name: "PO_Type",
        display_name: "PO Type",
        type: 12,
        choices: [
          {
            value: "Product Only",
            key: "Product Only",
          },
          {
            value: "Service Only",
            key: "Service Only",
          },
          {
            value: "Product + Service",
            key: "Product + Service",
          },
          {
            value: "Product + OM",
            key: "Product + OM",
          },
        ],
      },
      {
        link_name: "Amount",
        display_name: "Amount",
        type: 8,
      },
      {
        link_name: "Payment_Status",
        display_name: "Payment Status",
        type: 12,
        choices: [
          {
            value: "Unpaid",
            key: "Unpaid",
          },
          {
            value: "Deposit Paid",
            key: "Deposit Paid",
          },
          {
            value: "Partially Paid",
            key: "Partially Paid",
          },
          {
            value: "Paid",
            key: "Paid",
          },
        ],
      },
      {
        link_name: "Status",
        display_name: "Status",
        type: 12,
        choices: [
          {
            value: "Pending Manufacture",
            key: "Pending Manufacture",
          },
          {
            value: "Manufacturing",
            key: "Manufacturing",
          },
          {
            value: "In Transit",
            key: "In Transit",
          },
          {
            value: "On Site",
            key: "On Site",
          },
          {
            value: "Commissioning",
            key: "Commissioning",
          },
          {
            value: "Operating",
            key: "Operating",
          },
          {
            value: "Pending Collection",
            key: "Pending Collection",
          },
          {
            value: "PO Closed",
            key: "PO Closed",
          },
        ],
      },
      {
        link_name: "C4",
        display_name: "C4",
        type: 12,
        is_lookup_field: true,
      },
      {
        link_name: "Project",
        display_name: "Project",
        type: 12,
        is_lookup_field: true,
      },
    ],
  },
  {
    link_name: "Project_Documents",
    display_name: "Project Documents",
    type: 21,
    fields: [
      {
        link_name: "C4_Project",
        display_name: "C4",
        type: 12,
        choices: [
          {
            value: "Please input C4",
            key: "Please input C4",
          },
        ],
      },
      {
        link_name: "C4",
        display_name: "C4",
        type: 12,
        is_lookup_field: true,
      },
      {
        link_name: "Project",
        display_name: "Project",
        type: 12,
        is_lookup_field: true,
      },
      {
        link_name: "File_Type",
        display_name: "File Type",
        type: 12,
        choices: [
          {
            value: "Contract",
            key: "Contract",
          },
          {
            value: "Site Report",
            key: "Site Report",
          },
          {
            value: "Invoice",
            key: "Invoice",
          },
          {
            value: "PO",
            key: "PO",
          },
          {
            value: "PAT docs",
            key: "PAT docs",
          },
          {
            value: "SAT docs",
            key: "SAT docs",
          },
          {
            value: "Design docs",
            key: "Design docs",
          },
          {
            value: "Warranty Certificate",
            key: "Warranty Certificate",
          },
          {
            value: "Bank Guarantee",
            key: "Bank Guarantee",
          },
          {
            value: "Payment Proof",
            key: "Payment Proof",
          },
          {
            value: "Technical Agreement",
            key: "Technical Agreement",
          },
        ],
      },
      {
        link_name: "File_upload",
        display_name: "File upload",
        type: 19,
      },
    ],
  },
  {
    link_name: "Show_BOM",
    display_name: "Show BOM",
    type: 16,
  },
  {
    link_name: "BOM_Display",
    display_name: "BOM Display",
    type: 13,
    choices: [
      {
        value: "Detail View",
        key: "Detail View",
      },
      {
        value: "Stack View",
        key: "Stack View",
      },
    ],
  },
  {
    link_name: "plain_BOM",
    display_name: "",
    type: 24,
  },
  {
    link_name: "BOM_Stack_View",
    display_name: "BOM Stack View",
    type: 21,
    fields: [
      {
        link_name: "C4_Number",
        display_name: "C4 Number",
        type: 1,
      },
      {
        link_name: "Original_Product_Model",
        display_name: "Original Product Model",
        type: 12,
        is_lookup_field: true,
      },
      {
        link_name: "Original_Product_Code",
        display_name: "Original Product Code",
        type: 1,
      },
      {
        link_name: "Quantity",
        display_name: "Quantity",
        type: 5,
      },
      {
        link_name: "Warranty_Start_Date",
        display_name: "Warranty Start Date",
        type: 1,
      },
      {
        link_name: "Dispatch_Date",
        display_name: "Dispatch Date",
        type: 1,
      },
    ],
  },
  {
    link_name: "BOM",
    display_name: "BOM",
    type: 21,
    fields: [
      {
        link_name: "C4_Number_Project",
        display_name: "C4 Number",
        type: 12,
        choices: [
          {
            value: "Please input C4",
            key: "Please input C4",
          },
        ],
      },
      {
        link_name: "Site_Project",
        display_name: "Site",
        type: 12,
        choices: [
          {
            value: "Please input site",
            key: "Please input site",
          },
        ],
      },
      {
        link_name: "Original_Product_Model",
        display_name: "Original Product Model",
        type: 12,
        is_lookup_field: true,
      },
      {
        link_name: "Original_Quantity",
        display_name: "Original Quantity",
        type: 5,
      },
      {
        link_name: "Original_SN",
        display_name: "Original SN",
        type: 1,
      },
      {
        link_name: "Replacement_Product_Model",
        display_name: "Replacement Product Model",
        type: 12,
        is_lookup_field: true,
      },
      {
        link_name: "Replacement_Quantity",
        display_name: "Replacement Quantity",
        type: 5,
      },
      {
        link_name: "Replacement_SN",
        display_name: "Replacement SN",
        type: 1,
      },
      {
        link_name: "History",
        display_name: "History",
        type: 2,
      },
      {
        link_name: "Item_Type",
        display_name: "Item Type",
        type: 12,
        choices: [
          {
            value: "Running Product",
            key: "Running Product",
          },
          {
            value: "Spare Part",
            key: "Spare Part",
          },
        ],
      },
      {
        link_name: "Warranty_Type_Legacy",
        display_name: "Warranty Type",
        type: 12,
        choices: [
          {
            value: "2 years Standard Warranty",
            key: "2 years Standard Warranty",
          },
          {
            value: "3 years Standard Warranty",
            key: "3 years Standard Warranty",
          },
          {
            value: "5 years Standard Warranty",
            key: "5 years Standard Warranty",
          },
          {
            value: "5 years Standard + 5 years Parts",
            key: "5 years Standard + 5 years Parts",
          },
          {
            value: "10 years Standard Warranty",
            key: "10 years Standard Warranty",
          },
          {
            value: "10 years Standard + 5 years Parts",
            key: "10 years Standard + 5 years Parts",
          },
          {
            value: "10 years Standard + 10 years Parts",
            key: "10 years Standard + 10 years Parts",
          },
          {
            value: "10 years Standard + 15 years Parts",
            key: "10 years Standard + 15 years Parts",
          },
          {
            value: "12 years Standard Warranty",
            key: "12 years Standard Warranty",
          },
          {
            value: "15 years Standard Warranty",
            key: "15 years Standard Warranty",
          },
          {
            value: "20 years Standard Warranty",
            key: "20 years Standard Warranty",
          },
        ],
      },
      {
        link_name: "Warranty_Type",
        display_name: "Warranty Type",
        type: 12,
        is_lookup_field: true,
      },
      {
        link_name: "Warranty_Start_Date",
        display_name: "Warranty Start Date",
        type: 10,
      },
      {
        link_name: "Dispatch_Date",
        display_name: "Dispatch Date",
        type: 10,
      },
      {
        link_name: "Status",
        display_name: "Status",
        type: 12,
        choices: [
          {
            value: "Manufacturing",
            key: "Manufacturing",
          },
          {
            value: "Shipping",
            key: "Shipping",
          },
          {
            value: "On Site",
            key: "On Site",
          },
          {
            value: "Commissioning",
            key: "Commissioning",
          },
          {
            value: "Running",
            key: "Running",
          },
          {
            value: "Faulty",
            key: "Faulty",
          },
          {
            value: "Replaced",
            key: "Replaced",
          },
          {
            value: "Returned",
            key: "Returned",
          },
          {
            value: "Scrapped",
            key: "Scrapped",
          },
        ],
      },
      {
        link_name: "Fault_Type",
        display_name: "Fault Type",
        type: 12,
        choices: [
          {
            value: "Inverter",
            key: "Inverter",
          },
          {
            value: "Local controller",
            key: "Local controller",
          },
          {
            value: "BMU",
            key: "BMU",
          },
          {
            value: "Relay",
            key: "Relay",
          },
          {
            value: "CMU",
            key: "CMU",
          },
          {
            value: "BMS",
            key: "BMS",
          },
          {
            value: "BSC",
            key: "BSC",
          },
          {
            value: "PCS",
            key: "PCS",
          },
          {
            value: "Battery pack",
            key: "Battery pack",
          },
          {
            value: "DC-DC",
            key: "DC-DC",
          },
          {
            value: "LCU",
            key: "LCU",
          },
          {
            value: "Aircon",
            key: "Aircon",
          },
          {
            value: "Fire suppression",
            key: "Fire suppression",
          },
          {
            value: "DC switch",
            key: "DC switch",
          },
          {
            value: "Fuse",
            key: "Fuse",
          },
          {
            value: "Breaker",
            key: "Breaker",
          },
          {
            value: "Logger",
            key: "Logger",
          },
          {
            value: "Door",
            key: "Door",
          },
          {
            value: "lock",
            key: "lock",
          },
          {
            value: "Communication cable",
            key: "Communication cable",
          },
          {
            value: "Power cable",
            key: "Power cable",
          },
        ],
      },
      {
        link_name: "Fault_Code",
        display_name: "Fault Code",
        type: 1,
      },
      {
        link_name: "Fault_Start_Date",
        display_name: "Fault Start Date",
        type: 10,
      },
      {
        link_name: "Fault_Description",
        display_name: "Fault Description",
        type: 2,
      },
      {
        link_name: "Project",
        display_name: "Project",
        type: 12,
        is_lookup_field: true,
      },
    ],
  },
  {
    link_name: "Accounts",
    display_name: "Accounts",
    type: 21,
    fields: [
      {
        link_name: "Account",
        display_name: "Account",
        type: 12,
        is_lookup_field: true,
      },
      {
        link_name: "Username",
        display_name: "Username",
        type: 1,
      },
    ],
  },
  {
    link_name: "Team",
    display_name: "Team",
    type: 14,
    is_lookup_field: true,
  },
  {
    link_name: "Access",
    display_name: "Access",
    type: 5,
  },
  {
    link_name: "Is_Subform",
    display_name: "Is Subform",
    type: 16,
  },
  {
    link_name: "Flag",
    display_name: "Flag",
    type: 5,
  },
] as const;
