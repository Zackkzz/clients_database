/** Form/report relationships from the supplied Creator export; contains no records. */
export const subformSources: Record<string, { form: string; report: string }> =
  {
    BOM: { form: "BOM", report: "BOM_Record" },
    Meeting_Note: {
      form: "Meeting_Note",
      report: "Meeting_Notes",
    },
    Staff: {
      form: "Client_Staff",
      report: "Client_Staffs",
    },
    Site: {
      form: "Site",
      report: "Sites",
    },
    Leads: {
      form: "Lead",
      report: "Leads",
    },
    Project: {
      form: "Project",
      report: "Project_Report",
    },
    C4: {
      form: "C4",
      report: "C4_Report",
    },
    PO: {
      form: "PO",
      report: "PO_Record",
    },
    Project_Documents: {
      form: "Project_Document",
      report: "C4_Documents",
    },
  };
export const lookupSources: Record<string, { form: string; report: string }> = {
  "Meeting_Note.To_Do": { form: "To_Do", report: "To_Do_List" },
  "Meeting_Note.Client": {
    form: "Client",
    report: "Client_Legacy",
  },
  "Client_Staff.Client": {
    form: "Client",
    report: "Client_Legacy",
  },
  "Site.Client": {
    form: "Client",
    report: "Client_Legacy",
  },
  "Site.BOM": {
    form: "BOM",
    report: "BOM_Record",
  },
  "Lead.Client": {
    form: "Client",
    report: "Client_Legacy",
  },
  "Lead.Country": {
    form: "Country",
    report: "Countries",
  },
  "Lead.Sales": {
    form: "Sales",
    report: "Sales_List",
  },
  "Lead.Configuration": {
    form: "Model",
    report: "Models",
  },
  "Lead.Reach_Out": {
    form: "Reach_Out",
    report: "Reach_Out_Report",
  },
  "Project.Country": {
    form: "Country",
    report: "Countries",
  },
  "Project.Project_Manager": {
    form: "Project_Manager",
    report: "Project_Managers",
  },
  "Project.Sales": {
    form: "Sales",
    report: "Sales_List",
  },
  "Project.Distributor": {
    form: "Distributor",
    report: "Distributor_List",
  },
  "Project.Client": {
    form: "Client",
    report: "Client_Legacy",
  },
  "Project.C4": {
    form: "C4",
    report: "C4_Report",
  },
  "Project.Site": {
    form: "Site",
    report: "Sites",
  },
  "Project.Configuration": {
    form: "Model",
    report: "Models",
  },
  "Project.Documents": {
    form: "Project_Document",
    report: "C4_Documents",
  },
  "Project.Warranty_Tickets": {
    form: "CSR_Order",
    report: "CSR_Orders",
  },
  "Project.Milestone_Tracker": {
    form: "Milestone_Tracker",
    report: "Milestones",
  },
  "Project.Service_Requests": {
    form: "Service_Request_Internal",
    report: "Service_Request_Report1",
  },
  "Project.Software_Iteration": {
    form: "Software_Iteration",
    report: "Software_Iteration_Report",
  },
  "Project.Rectification": {
    form: "Rectification",
    report: "Rectifications",
  },
  "Project.Issue_Register": {
    form: "Issue_Register_Form",
    report: "Issue_Registers",
  },
  "Project.Service_Tickets": {
    form: "Service_Ticket",
    report: "Service_Ticket_List",
  },
  "Project.On_Site_Service_Record": {
    form: "On_Site_Service_Form",
    report: "On_site_Service_Record",
  },
  "Project.Business_Trip_Applications": {
    form: "Business_Trip_Application",
    report: "Business_Trip_Applications",
  },
  "Project.BOM_Stack_View": {
    form: "Product_Model",
    report: "Product_Model_List",
  },
  "Project.BOM": {
    form: "Product_Model",
    report: "Product_Model_List",
  },
  "Project.PO": {
    form: "PO",
    report: "PO_Record",
  },
  "Project.Added_By": {
    form: "Staff",
    report: "Staff_List",
  },
  "Project.Software_Iteration_Log": {
    form: "Software_Iteration_Log",
    report: "Software_Iteration_Logs",
  },
  "C4.Client": {
    form: "Client",
    report: "Client_Legacy",
  },
  "C4.Project": {
    form: "Project",
    report: "Project_Report",
  },
  "C4.Client_Staff": {
    form: "Client_Staff",
    report: "Client_Staffs",
  },
  "C4.C4_Documents": {
    form: "Project_Document",
    report: "C4_Documents",
  },
  "C4.PO": {
    form: "PO",
    report: "PO_Record",
  },
  "C4.BOM_Stack_View": {
    form: "Product_Model",
    report: "Product_Model_List",
  },
  "C4.BOM": {
    form: "Product_Model",
    report: "Product_Model_List",
  },
  "PO.C4": {
    form: "C4",
    report: "C4_Report",
  },
  "PO.Project": {
    form: "Project",
    report: "Project_Report",
  },
  "PO.Client": {
    form: "Client",
    report: "Client_Legacy",
  },
  "PO.BOM": {
    form: "BOM",
    report: "BOM_Record",
  },
  "Project_Document.C4": {
    form: "C4",
    report: "C4_Report",
  },
  "Project_Document.Project": {
    form: "Project",
    report: "Project_Report",
  },
  "Project_Document.Client": {
    form: "Client",
    report: "Client_Legacy",
  },
};

lookupSources["BOM.Original_Product_Model"] = {
  form: "Product_Model",
  report: "Product_Model_List",
};
lookupSources["BOM.Replacement_Product_Model"] = {
  form: "Product_Model",
  report: "Product_Model_List",
};
