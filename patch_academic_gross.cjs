const fs = require('fs');
let code = fs.readFileSync('services/pricingEngine.ts', 'utf8');

const anchor = `    // NEW LOGO / STANDARD CALCULATION
    let listRate = 0;
    let baseGross = 0;
    
    if (config.institutionType === InstitutionType.ACADEMIC) {
      if (prodId === "utd") {
        const faculty = Number(inputs.facultyCount) || 0;
        const residents = Number(inputs.residentsCount) || 0;
        const med = Number(inputs.medStudentsCount) || 0;
        const pharma = Number(inputs.pharmaStudentsCount) || 0;
        const eduDiscount = (Number(inputs.educationalDiscount) || 0) / 100;
        const hospitalHc = Number(inputs.count) || 0;
        
        const academicClinicianBase = (faculty + residents) * (inputs.variant === "UTDEE" ? 210 : (inputs.variant === "UTDEE (265)" ? 265 : UTD_ACADEMIC_FACULTY_PRICE));
        let hospitalCost = 0;
        if (config.includeHospital) {
           const vPrice = inputs.variant === "UTDADV" ? UTD_VARIANTS["ANYWHERE"] : (UTD_VARIANTS[inputs.variant] || 0);
           hospitalCost = hospitalHc * vPrice;
           // Apply discount to hospital rate if bundled
           hospitalCost = hospitalCost * (1 - eduDiscount);
        }
        
        // If pure academic, discount applies to the faculty+residents cost
        const finalAcademicClinicianCost = config.includeHospital ? academicClinicianBase : (academicClinicianBase * (1 - eduDiscount));
        
        const studentCost = (med * UTD_ACADEMIC_STUDENT_MED) + (pharma * UTD_ACADEMIC_STUDENT_PHARMA);
        
        baseGross = finalAcademicClinicianCost + studentCost + hospitalCost;
        
        if (inputs.variant === "UTDADV") {
           baseGross = baseGross * 1.08;
        }
        
        // EAI Activation
        const eaiActive = inputs.eaiActivation ?? true;
        if (eaiActive) {
          baseGross = baseGross * 1.03;
        }
        
      } else if (prodId === "lxd") {
        const totalStudents = Number(inputs.totalStudentsCount) || 0;
        const lxdBase = (inputs.lxdAcademicBase ?? true) ? LXD_ACADEMIC_BASE : 0;
        const lxdSelect = inputs.lxdAcademicSelect ? LXD_ACADEMIC_SELECT : 0;
        const lxdMartindale = inputs.lxdAcademicMartindale ? LXD_ACADEMIC_MARTINDALE : 0;
        
        const academicCost = totalStudents * (lxdBase + lxdSelect + lxdMartindale);
        
        let hospitalCost = 0;
        if (config.includeHospital) {
            const beds = Number(inputs.count) || 0;
            const vPrice = LXD_VARIANTS[inputs.variant] || 0;
            hospitalCost = beds * vPrice;
        }
        
        baseGross = academicCost + hospitalCost;
      }
    }`;

const replacement = `    // NEW LOGO / STANDARD CALCULATION
    let listRate = 0;
    let baseGross = 0;
    
    const calculateAcademicGross = (
      pId: string,
      variant: string,
      faculty: number,
      residents: number,
      med: number,
      pharma: number,
      eduDiscount: number,
      hospitalHc: number,
      eaiActive: boolean,
      totalStudents: number,
    ) => {
        if (pId === "utd") {
            const academicClinicianBase = (faculty + residents) * (variant === "UTDEE" ? 210 : (variant === "UTDEE (265)" ? 265 : UTD_ACADEMIC_FACULTY_PRICE));
            let hospitalCost = 0;
            if (config.includeHospital) {
               const vPrice = variant === "UTDADV" ? UTD_VARIANTS["ANYWHERE"] : (UTD_VARIANTS[variant] || 0);
               hospitalCost = hospitalHc * vPrice;
               hospitalCost = hospitalCost * (1 - eduDiscount);
            }
            const finalAcademicClinicianCost = config.includeHospital ? academicClinicianBase : (academicClinicianBase * (1 - eduDiscount));
            const studentCost = (med * UTD_ACADEMIC_STUDENT_MED) + (pharma * UTD_ACADEMIC_STUDENT_PHARMA);
            let g = finalAcademicClinicianCost + studentCost + hospitalCost;
            if (variant === "UTDADV") g = g * 1.08;
            if (eaiActive) g = g * 1.03;
            return g;
        } else if (pId === "lxd") {
            const lxdBase = (inputs.lxdAcademicBase ?? true) ? LXD_ACADEMIC_BASE : 0;
            const lxdSelect = inputs.lxdAcademicSelect ? LXD_ACADEMIC_SELECT : 0;
            const lxdMartindale = inputs.lxdAcademicMartindale ? LXD_ACADEMIC_MARTINDALE : 0;
            const academicCost = totalStudents * (lxdBase + lxdSelect + lxdMartindale);
            let hospitalCost = 0;
            if (config.includeHospital) {
                const vPrice = LXD_VARIANTS[variant] || 0;
                hospitalCost = hospitalHc * vPrice;
            }
            return academicCost + hospitalCost;
        }
        return 0;
    };
    
    let oldAcademicGross = 0;
    let newAcademicGross = 0;

    if (config.institutionType === InstitutionType.ACADEMIC) {
      const eActive = inputs.eaiActivation ?? true;
      const eduDiscount = (Number(inputs.educationalDiscount) || 0) / 100;
      
      newAcademicGross = calculateAcademicGross(
          prodId, inputs.variant, 
          Number(inputs.facultyCount) || 0, Number(inputs.residentsCount) || 0,
          Number(inputs.medStudentsCount) || 0, Number(inputs.pharmaStudentsCount) || 0,
          eduDiscount, Number(inputs.count) || 0, eActive, Number(inputs.totalStudentsCount) || 0
      );
      
      oldAcademicGross = calculateAcademicGross(
          prodId, inputs.existingVariant || inputs.variant, 
          Number(inputs.existingFacultyCount) || 0, Number(inputs.existingResidentsCount) || 0,
          Number(inputs.existingMedStudentsCount) || 0, Number(inputs.existingPharmaStudentsCount) || 0,
          eduDiscount, Number(inputs.existingCount) || 0, eActive, Number(inputs.existingTotalStudentsCount) || 0
      );
      
      baseGross = newAcademicGross;
    }`;

if (code.includes(anchor)) {
    fs.writeFileSync('services/pricingEngine.ts', code.replace(anchor, replacement));
    console.log("Patched gross helper successfully.");
} else {
    console.log("Could not find anchor.");
}
