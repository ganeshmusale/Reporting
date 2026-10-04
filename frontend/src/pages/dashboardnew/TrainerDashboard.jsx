import React, {
    useEffect,
    useMemo,
    useState,
    useRef,
} from "react";

import {
    Button,
    Modal,
    Form,
    Spinner,
    Alert,
    Row,
    Col,
} from "react-bootstrap";
import * as XLSX from "xlsx";

import { API_BASE_URL, BACKEND_ROOT_URL } from "../../config/api";


const TRAINER_REPORTS_API =
    `${API_BASE_URL}/trainer-reports`;

const TRAINER_UPLOAD_URL =
    `${BACKEND_ROOT_URL}/uploads/trainer-reports`;

console.log(
    "TRAINER DASHBOARD API:",
    TRAINER_REPORTS_API
);

// =====================================================
// EMPTY FORM
// =====================================================

const EMPTY_FORM = {

    name: "",

    designation: "",

    taluka: "",

    district: "",

    mobileNumber: "",

    reportDate: "",

    totalShopsVisitedToday: "",

    totalPanelRegistrationAmount: "",

    paymentMode: "",

    shopPhoto: null,

    shopkeeperRegistrationPhoto: null,

    workPhotoVideo: null,

};


// =====================================================
// NORMALIZE
// =====================================================

const normalize = (value) => {

    return String(value ?? "")
        .trim()
        .toLowerCase();

};


// =====================================================
// DATE FOR INPUT
// =====================================================

const getInputDate = (value) => {

    if (!value) {
        return "";
    }

    const text =
        String(value);

    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            text
        )
    ) {
        return text;
    }

    if (
        text.includes("T")
    ) {
        return text.split("T")[0];
    }

    return "";
};


// =====================================================
// DATE DISPLAY
// =====================================================

const formatDisplayDate = (value) => {

    const date =
        getInputDate(value);

    if (!date) {
        return "-";
    }

    const [
        year,
        month,
        day,
    ] = date.split("-");

    return `${day}-${month}-${year}`;
};


// =====================================================
// GET PHOTO 1
// =====================================================

const getPhoto1 = (report) => report?.shop_photo || "";


// =====================================================
// GET PHOTO 2
// =====================================================

const getPhoto2 = (report) =>
    report?.shopkeeper_registration_photo || "";


// =====================================================
// IMAGE URL
// =====================================================

const getImageUrl = (imagePath) => {

    if (!imagePath) {
        return "";
    }

    let value =
        String(imagePath).trim();

    if (!value) {
        return "";
    }


    // Full URL

    if (
        value.startsWith(
            "http://"
        ) ||
        value.startsWith(
            "https://"
        )
    ) {

        return value;

    }


    // /uploads/...

    if (
        value.startsWith(
            "/uploads/"
        )
    ) {

        return (
            BACKEND_ROOT_URL +
            value
        );

    }


    // uploads/...

    if (
        value.startsWith(
            "uploads/"
        )
    ) {

        return (
            BACKEND_ROOT_URL +
            "/" +
            value
        );

    }


    // trainer-reports/...

    if (
        value.startsWith(
            "trainer-reports/"
        )
    ) {

        return (
            BACKEND_ROOT_URL +
            "/uploads/" +
            value
        );

    }


    // Only filename

    return (
        TRAINER_UPLOAD_URL +
        "/" +
        value
    );

};


// =====================================================
// GET CURRENT TRAINER
// =====================================================

const getCurrentTrainerUser = () => {

    try {

        const directUser = {

            id:
                localStorage.getItem(
                    "logged_in_user_id"
                ) || "",

            userId:
                localStorage.getItem(
                    "logged_in_user_id"
                ) || "",

            trainerId:
                localStorage.getItem(
                    "logged_in_trainer_id"
                ) || "",

            trainerName:
                localStorage.getItem(
                    "logged_in_trainer_name"
                ) || "",

            name:
                localStorage.getItem(
                    "logged_in_name"
                ) || "",

            taluka:
                localStorage.getItem(
                    "logged_in_taluka_name"
                ) || "",

            district:
                localStorage.getItem(
                    "logged_in_district_name"
                ) || "",

        };


        if (
            directUser.name ||
            directUser.trainerName
        ) {

            return directUser;

        }


        const usersRaw =
            localStorage.getItem(
                "users"
            );

        if (!usersRaw) {
            return {};
        }


        const users =
            JSON.parse(
                usersRaw
            );


        if (
            !Array.isArray(users)
        ) {
            return {};
        }


        const userId =
            localStorage.getItem(
                "logged_in_user_id"
            );

        const trainerId =
            localStorage.getItem(
                "logged_in_trainer_id"
            );


        const found =
            users.find(
                (user) => {

                    if (!user) {
                        return false;
                    }


                    const storedUserId =
                        String(
                            user.id ??
                            user.userId ??
                            user.email ??
                            user.username ??
                            user.loginId ??
                            ""
                        ).trim();


                    const storedTrainerId =
                        String(
                            user.trainerId ??
                            user.trainerID ??
                            user.trainer_id ??
                            ""
                        );


                    return (

                        storedUserId ===
                        String(
                            userId ?? ""
                        ).trim()

                        ||

                        (
                            trainerId &&
                            storedTrainerId ===
                            String(
                                trainerId
                            )
                        )

                    );

                }
            );


        return found || {};

    } catch (error) {

        console.error(
            "GET TRAINER USER ERROR:",
            error
        );

        return {};

    }

};


// =====================================================
// REPORT / CURRENT TRAINER MATCHING
// =====================================================

const getReportTrainerId = (report) => {
    return String(
        report?.trainer_id ??
        report?.trainerId ??
        report?.trainerID ??
        report?.trainer_user_id ??
        report?.trainerUserId ??
        report?.user_id ??
        report?.userId ??
        ""
    ).trim();
};

const getReportTrainerName = (report) => {
    return (
        report?.created_by ??
        report?.createdBy ??
        report?.trainer_name ??
        report?.trainerName ??
        report?.trainer ??
        ""
    );
};

const getReportTaluka = (report) => {
    return (
        report?.taluka ??
        report?.taluka_name ??
        report?.talukaName ??
        ""
    );
};

const getReportDistrict = (report) => {
    return (
        report?.district ??
        report?.district_name ??
        report?.districtName ??
        ""
    );
};

const isReportForCurrentTrainer = (report, user) => {
    const currentUserId = String(
        user?.userId ??
        user?.user_id ??
        localStorage.getItem("logged_in_user_id") ??
        ""
    ).trim();

    const currentTrainerName = normalize(
        user?.trainerName ||
        user?.trainer ||
        user?.name ||
        user?.fullName ||
        localStorage.getItem("logged_in_trainer_name") ||
        localStorage.getItem("logged_in_name") ||
        ""
    );

    const reportTrainerId = getReportTrainerId(report);

    // Owned row → exact login user_id only
    if (reportTrainerId) {
        return Boolean(currentUserId) && reportTrainerId === currentUserId;
    }

    // Legacy unowned → mobile or created_by only
    const reportMobile = normalize(report?.mobile_number ?? report?.mobileNumber);
    const currentMobile = normalize(
        user?.mobileNumber ||
        user?.contactNumber ||
        localStorage.getItem("logged_in_mobile")
    );
    if (reportMobile && currentMobile && reportMobile === currentMobile) {
        return true;
    }

    const reportCreatedBy = normalize(getReportTrainerName(report));
    if (currentTrainerName && reportCreatedBy && reportCreatedBy === currentTrainerName) {
        return true;
    }

    return false;
};


// =====================================================
// COMPONENT
// =====================================================

const TrainerDashboard = () => {


    // =================================================
    // USER
    // =================================================

    const [
        currentUser,
        setCurrentUser,
    ] = useState(
        getCurrentTrainerUser()
    );


    // =================================================
    // REPORTS
    // =================================================

    const [
        reports,
        setReports,
    ] = useState([]);


    // =================================================
    // LOADING
    // =================================================

    const [
        loading,
        setLoading,
    ] = useState(true);


    // =================================================
    // SUBMITTING
    // =================================================

    const [
        submitting,
        setSubmitting,
    ] = useState(false);


    // =================================================
    // EXCEL DOWNLOAD
    // =================================================

    const handleDownloadExcel = () => {
        if (!filteredReports.length) {
            setError("Download करण्यासाठी कोणताही report उपलब्ध नाही.");
            return;
        }
        const headers = [
            "SR",
            "1 Date(दिनांक)",
            "2 BDO Full Name (BDO चे पूर्ण नाव)",
            "3 Designation (पद)",
            "4 Taluka Name (तालुक्याचे नाव)",
            "5 District Name (जिल्ह्याचे नाव)",
            "6 Mobile Number (मोबाईल नंबर)",
            "7 Total Number of Shops Visited Today (आज प्रत्यक्ष भेट दिलेल्या दुकानांची एकूण संख्या)",
            "8 Total Amount Collected from Today’s Panel Registrations (आजच्या Panel Registration मधून जमा झालेली एकूण रक्कम)",
            "9 Payment Mode (पेमेंट पद्धत)",
            "Status",
        ];
        const rows = filteredReports.map((r, i) => [
            i + 1,
            formatDisplayDate(r.report_date),
            r.name || "-",
            r.designation || "-",
            r.taluka || "-",
            r.district || "-",
            r.mobile_number || "-",
            r.total_shops_visited_today ?? 0,
            r.total_panel_registration_amount ?? 0,
            r.payment_mode || "-",
            r.status || "active",
        ]);
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "BDO Reports");
        XLSX.writeFile(wb, `BDO_Reports_${new Date().toISOString().split("T")[0]}.xlsx`);
        setSuccess("BDO reports downloaded successfully.");
    };


    // =================================================
    // DELETE
    // =================================================

    const [
        deletingId,
        setDeletingId,
    ] = useState(null);


    // =================================================
    // ERROR
    // =================================================

    const [
        error,
        setError,
    ] = useState("");


    const [
        modalError,
        setModalError,
    ] = useState("");


    const modalBodyRef = useRef(null);


    // =================================================
    // SUCCESS
    // =================================================

    const [
        success,
        setSuccess,
    ] = useState("");


    // =================================================
    // ADD / EDIT MODAL
    // =================================================

    const [
        showModal,
        setShowModal,
    ] = useState(false);


    // =================================================
    // IMAGE MODAL
    // =================================================

    const [
        showImageModal,
        setShowImageModal,
    ] = useState(false);


    const [
        selectedImage,
        setSelectedImage,
    ] = useState("");


    const [
        selectedImageTitle,
        setSelectedImageTitle,
    ] = useState("");


    // =================================================
    // SEARCH
    // =================================================

    const [
        search,
        setSearch,
    ] = useState("");

    // Separate Bootstrap-style filters
    const [filterName, setFilterName] = useState("");
    const [filterTaluka, setFilterTaluka] = useState("");
    const [filterDistrict, setFilterDistrict] = useState("");
    const [filterMobile, setFilterMobile] = useState("");
    const [filterDate, setFilterDate] = useState("");


    // =================================================
    // EDIT
    // =================================================

    const [
        editingId,
        setEditingId,
    ] = useState(null);


    // =================================================
    // OLD PHOTO
    // =================================================

    const [
        oldPhoto1,
        setOldPhoto1,
    ] = useState("");


    const [
        oldPhoto2,
        setOldPhoto2,
    ] = useState("");


    // =================================================
    // FORM
    // =================================================

    const [
        formData,
        setFormData,
    ] = useState({
        ...EMPTY_FORM,
    });


    // =================================================
    // USER DETAILS
    // =================================================

    const trainerName =

        currentUser?.trainerName ||

        currentUser?.trainer ||

        currentUser?.name ||

        currentUser?.fullName ||

        "Trainer";


    const talukaName =

        currentUser?.taluka ||

        currentUser?.talukaName ||

        localStorage.getItem(
            "logged_in_taluka_name"
        ) ||

        "";


    const districtName =

        currentUser?.district ||

        currentUser?.districtName ||

        localStorage.getItem(
            "logged_in_district_name"
        ) ||

        "";


    // =================================================
    // LOAD REPORTS
    // =================================================

    const fetchTrainerReports =
        async () => {

            try {

                setLoading(true);

                setError("");


                // =============================================
                // API REQUEST
                // =============================================

                // Build role-based query params so backend filters by logged-in user
                const loggedRole   = (localStorage.getItem("logged_in_role") || "").toLowerCase();
                const loggedUserId = localStorage.getItem("logged_in_user_id") || localStorage.getItem("user_id") || "";
                const loggedMobile = localStorage.getItem("logged_in_mobile")  || "";
                const loggedName   = localStorage.getItem("logged_in_name")    || "";
                const isAdmin      = loggedRole === "admin" || loggedRole === "superadmin";

                let trainerApiUrl = TRAINER_REPORTS_API;
                if (!isAdmin && loggedUserId) {
                    const params = new URLSearchParams();
                    params.set("role", loggedRole);
                    params.set("user_id", loggedUserId);
                    if (loggedMobile) params.set("mobile_number", loggedMobile);
                    if (loggedName) params.set("user_name", loggedName);
                    trainerApiUrl = `${TRAINER_REPORTS_API}?${params.toString()}`;
                }

                console.log(
                    "FETCHING TRAINER REPORTS:",
                    trainerApiUrl
                );

                const response =
                    await fetch(
                        trainerApiUrl,
                        {
                            method: "GET",
                            headers: {
                                Accept:
                                    "application/json",
                            },
                            cache: "no-store",
                        }
                    );

                const contentType =
                    response.headers.get(
                        "content-type"
                    ) || "";

                const data =
                    contentType.includes(
                        "application/json"
                    )
                        ? await response.json()
                        : {
                              message:
                                  await response.text(),
                          };

                console.log(
                    "TRAINER REPORTS API STATUS:",
                    response.status,
                    data
                );

                if (!response.ok) {

                    throw new Error(
                        data?.message ||
                        data?.error ||
                        `Trainer reports API returned HTTP ${response.status}`
                    );

                }


                const rows =

                    data?.reports ||

                    data?.data ||

                    [];


                const reportRows = Array.isArray(rows)
                    ? rows
                    : [];

                // =====================================================
                // CURRENT TRAINER REPORTS ONLY
                // =====================================================
                // The API can return all trainer reports. This dashboard
                // must show only the reports belonging to the logged-in
                // trainer.
                //
                // Matching priority:
                // 1. trainer_id / user_id when available
                // 2. trainer name for existing legacy rows
                // 3. taluka + district as a last legacy fallback
                // =====================================================

                const activeUser =
                    getCurrentTrainerUser();

                setCurrentUser(activeUser);

                const myTrainerReports =
                    reportRows.filter(
                        (report) =>
                            isReportForCurrentTrainer(
                                report,
                                activeUser
                            )
                    );

                console.log(
                    "ALL TRAINER REPORTS FROM DATABASE:",
                    reportRows
                );

                console.log(
                    "CURRENT TRAINER:",
                    activeUser
                );

                console.log(
                    "MY TRAINER REPORT COUNT:",
                    myTrainerReports.length
                );

                console.log(
                    "MY TRAINER REPORTS:",
                    myTrainerReports
                );

                // Admin sees all trainer reports; trainer sees only their own.
                setReports(isAdmin ? reportRows : myTrainerReports);


            } catch (err) {

                console.error(
                    "FETCH TRAINER REPORTS ERROR:",
                    err
                );


                let friendlyMessage =
                    err?.message ||
                    "Unable to load Trainer reports.";

                if (
                    err?.message ===
                    "Failed to fetch"
                ) {
                    friendlyMessage =
                        `Unable to connect to Trainer Reports API. Please check backend/CORS. API: ${TRAINER_REPORTS_API}`;
                }

                setError(
                    friendlyMessage
                );


                setReports([]);

            } finally {

                setLoading(false);

            }

        };


    // =================================================
    // INITIAL LOAD
    // =================================================

    useEffect(() => {

        setCurrentUser(
            getCurrentTrainerUser()
        );

        fetchTrainerReports();

    }, []);


    // =================================================
    // SEARCH
    // =================================================

    const filteredReports = useMemo(() => {

        const globalKeyword = normalize(search);
        const nameKeyword = normalize(filterName);
        const talukaKeyword = normalize(filterTaluka);
        const districtKeyword = normalize(filterDistrict);
        const mobileKeyword = normalize(filterMobile);

        return reports.filter((report) => {
            const reportDate = getInputDate(report?.report_date);

            const matchesGlobal = !globalKeyword || [
                report?.name,
                report?.designation,
                report?.taluka,
                report?.district,
                report?.mobile_number,
                report?.report_date,
                report?.total_shops_visited_today,
                report?.total_panel_registration_amount,
                report?.payment_mode,
                report?.shop_photo,
                report?.shopkeeper_registration_photo,
                report?.work_photo_video,
                report?.status,
            ].some((value) =>
                normalize(value).includes(globalKeyword)
            );

            const matchesName = !nameKeyword ||
                normalize(report?.name).includes(nameKeyword);

            const matchesTaluka = !talukaKeyword ||
                normalize(report?.taluka).includes(talukaKeyword);

            const matchesDistrict = !districtKeyword ||
                normalize(report?.district).includes(districtKeyword);

            const matchesMobile = !mobileKeyword ||
                normalize(report?.mobile_number).includes(mobileKeyword);

            const matchesDate = !filterDate ||
                reportDate === filterDate;

            return (
                matchesGlobal &&
                matchesName &&
                matchesTaluka &&
                matchesDistrict &&
                matchesMobile &&
                matchesDate
            );
        });
    }, [
        reports,
        search,
        filterName,
        filterTaluka,
        filterDistrict,
        filterMobile,
        filterDate,
    ]);

    const clearAllFilters = () => {
        setSearch("");
        setFilterName("");
        setFilterTaluka("");
        setFilterDistrict("");
        setFilterMobile("");
        setFilterDate("");
    };


    // =================================================
    // INPUT CHANGE
    // =================================================

    const handleChange = (
        event
    ) => {

        const {
            name,
            value,
            files,
            type,
        } = event.target;


        // =============================================
        // FILE
        // =============================================

        if (
            type === "file"
        ) {

            const file =
                files?.[0] ||
                null;


            if (!file) {

                setFormData(
                    (prev) => ({
                        ...prev,
                        [name]: null,
                    })
                );

                return;

            }


            const allowedTypes = [

                "image/jpeg",

                "image/jpg",

                "image/png",

                "image/webp",

                "video/mp4",

                "video/webm",

                "video/quicktime",

            ];


            if (
                !allowedTypes.includes(
                    file.type
                )
            ) {

                alert(
                    "Only JPG, JPEG, PNG, WEBP or supported video files are allowed."
                );

                event.target.value =
                    "";

                return;

            }


            if (
                file.size >
                50 * 1024 * 1024
            ) {

                alert(
                    "File size must be less than 50 MB."
                );

                event.target.value =
                    "";

                return;

            }


            setFormData(
                (prev) => ({
                    ...prev,
                    [name]: file,
                })
            );


            return;

        }


        // =============================================
        // NORMAL INPUT
        // =============================================

        setFormData(
            (prev) => ({
                ...prev,
                [name]: value,
            })
        );

    };


    // =================================================
    // OPEN ADD MODAL
    // =================================================

    const handleAddReport = () => {

        const today =
            new Date()
                .toISOString()
                .split("T")[0];


        setEditingId(null);

        setOldPhoto1("");

        setOldPhoto2("");


        // Fresh add form — prefill from logged-in BDO, never keep stale files
        const loggedMobile =
            localStorage.getItem("logged_in_mobile") || "";

        setFormData({
            ...EMPTY_FORM,
            name: trainerName || "",
            designation: "BDO",
            taluka: talukaName || "",
            district: districtName || "",
            mobileNumber: /^\d{10}$/.test(loggedMobile) ? loggedMobile : "",
            reportDate: today,
            shopPhoto: null,
            shopkeeperRegistrationPhoto: null,
            workPhotoVideo: null,
        });


        setModalError("");

        setError("");

        setSuccess("");

        setShowModal(true);

    };


    // =================================================
    // EDIT
    // =================================================

    const handleEdit = (
        report
    ) => {

        setEditingId(
            report.id
        );


        setOldPhoto1(
            getPhoto1(
                report
            )
        );


        setOldPhoto2(
            getPhoto2(
                report
            )
        );


        setFormData({

            name:
                report.name ||
                "",


            designation:
                report.designation ||
                "",


            taluka:
                report.taluka ||
                "",


            district:
                report.district ||
                "",


            mobileNumber:

                report.mobile_number ??

                report.mobileNumber ??

                "",


            reportDate:

                getInputDate(

                    report.report_date ??

                    report.reportDate

                ),


            totalShopsVisitedToday:
                report.total_shops_visited_today ??
                report.totalShopsVisitedToday ??
                "",

            totalPanelRegistrationAmount:
                report.total_panel_registration_amount ??
                report.totalPanelRegistrationAmount ??
                "",

            paymentMode:
                report.payment_mode ??
                report.paymentMode ??
                "",

            shopPhoto: null,

            shopkeeperRegistrationPhoto: null,

            workPhotoVideo: null,

        });


        setModalError("");

        setError("");

        setSuccess("");

        setShowModal(true);

    };


    // =================================================
    // CLOSE MODAL
    // =================================================

    const handleClose = () => {

        if (
            submitting
        ) {
            return;
        }


        setShowModal(false);

        setModalError("");

        // If editing existing report, reset state.
        // If drafting a new report, preserve formData so user doesn't lose typed data.
        if (editingId) {
            setEditingId(null);

            setOldPhoto1("");

            setOldPhoto2("");

            setFormData({
                ...EMPTY_FORM,
            });
        }

    };


    // =================================================
    // VIEW IMAGE
    // =================================================

    const handleViewImage = (
        image,
        title
    ) => {

        const url =
            getImageUrl(
                image
            );


        if (!url) {
            return;
        }


        setSelectedImage(
            url
        );


        setSelectedImageTitle(
            title ||
            "Meeting Photo"
        );


        setShowImageModal(true);

    };


    // =================================================
    // CLOSE IMAGE
    // =================================================

    const handleCloseImage = () => {

        setShowImageModal(false);

        setSelectedImage("");

        setSelectedImageTitle("");

    };


    // =================================================
    // VALIDATION
    // =================================================

    const validateForm = () => {
        if (!formData.name.trim()) return "Please enter BDO Full Name.";
        if (!formData.designation.trim()) return "Please enter Designation.";
        if (!formData.taluka.trim()) return "Please enter Taluka Name.";
        if (!formData.district.trim()) return "Please enter District Name.";
        if (!/^[0-9]{10}$/.test(formData.mobileNumber.trim())) {
            return "Mobile Number must be exactly 10 digits.";
        }
        if (!formData.reportDate) return "Please select Date.";

        const shops = Number(formData.totalShopsVisitedToday);
        const amount = Number(formData.totalPanelRegistrationAmount);
        if (!Number.isInteger(shops) || shops < 0) {
            return "Total Number of Shops Visited Today is invalid.";
        }
        if (!Number.isFinite(amount) || amount < 0) {
            return "Total Amount Collected is invalid.";
        }
        if (!["Cash", "UPI", "Online", "Bank Transfer"].includes(formData.paymentMode)) {
            return "Please select a valid Payment Mode.";
        }
        return "";
    };


    // =================================================
    // SUBMIT
    // =================================================

    const handleSubmit =
        async (
            event
        ) => {

            event.preventDefault();


            const validationError =
                validateForm();


            if (
                validationError
            ) {

                setModalError(
                    validationError
                );

                setError(
                    validationError
                );

                if (modalBodyRef.current) {
                    modalBodyRef.current.scrollTop = 0;
                }

                return;

            }


            try {

                setSubmitting(true);

                setModalError("");

                setError("");

                setSuccess("");


                // =====================================
                // FORMDATA
                // =====================================

                const data =
                    new FormData();


                // =====================================
                // BASIC
                // =====================================

                // Trainer identity: prioritize entered form values, fallback to logged-in user.
                const submitTrainerName =
                    formData.name.trim() ||
                    trainerName;

                const submitDesignation =
                    formData.designation.trim() ||
                    currentUser?.designation ||
                    "BDO";

                const submitTaluka =
                    formData.taluka.trim() ||
                    talukaName;

                const submitDistrict =
                    formData.district.trim() ||
                    districtName;

                data.append(
                    "name",
                    submitTrainerName.trim()
                );


                data.append(
                    "designation",
                    submitDesignation.trim()
                );


                data.append(
                    "taluka",
                    submitTaluka.trim()
                );


                data.append(
                    "district",
                    submitDistrict.trim()
                );

                if (!talukaName && submitTaluka) {
                    localStorage.setItem("logged_in_taluka_name", submitTaluka);
                }
                if (!districtName && submitDistrict) {
                    localStorage.setItem("logged_in_district_name", submitDistrict);
                }

                // =====================================================
                // LOGGED-IN TRAINER IDENTITY
                // =====================================================
                // Send stable IDs when available so future reports can
                // always be matched to the correct logged-in trainer.
                const loggedInTrainerId =
                    String(
                        currentUser?.trainerId ??
                        currentUser?.trainerID ??
                        currentUser?.trainer_id ??
                        localStorage.getItem(
                            "logged_in_trainer_id"
                        ) ??
                        ""
                    ).trim();

                const loggedInUserId =
                    String(
                        currentUser?.id ??
                        currentUser?.userId ??
                        currentUser?.user_id ??
                        localStorage.getItem(
                            "logged_in_user_id"
                        ) ??
                        ""
                    ).trim();

                if (loggedInTrainerId) {
                    data.append(
                        "trainer_id",
                        loggedInTrainerId
                    );
                }

                if (loggedInUserId) {
                    data.append(
                        "user_id",
                        loggedInUserId
                    );
                    data.append(
                        "created_by_id",
                        loggedInUserId
                    );
                    data.append(
                        "updated_by_id",
                        loggedInUserId
                    );
                }

                data.append("role", "trainer");
                data.append("created_by_role", "trainer");
                data.append(
                    "created_by",
                    String(
                        currentUser?.name ||
                        localStorage.getItem("logged_in_name") ||
                        formData.name ||
                        ""
                    ).trim()
                );
                data.append(
                    "updated_by",
                    String(
                        currentUser?.name ||
                        localStorage.getItem("logged_in_name") ||
                        formData.name ||
                        ""
                    ).trim()
                );

                data.append(
                    "mobile_number",
                    formData.mobileNumber.trim()
                );


                data.append(
                    "report_date",
                    formData.reportDate
                );


                data.append(
                    "total_shops_visited_today",
                    Number(formData.totalShopsVisitedToday) || 0
                );
                data.append(
                    "total_panel_registration_amount",
                    Number(formData.totalPanelRegistrationAmount) || 0
                );
                data.append("payment_mode", formData.paymentMode);

                // =====================================
                // URL
                // =====================================

                const url =
                    editingId
                        ? `${TRAINER_REPORTS_API}/${editingId}`
                        : TRAINER_REPORTS_API;


                // =====================================
                // METHOD
                // =====================================

                const method =
                    editingId
                        ? "PUT"
                        : "POST";


                // =====================================
                // REQUEST
                // =====================================

                const response =
                    await fetch(
                        url,
                        {
                            method,
                            body: data,
                        }
                    );


                const contentType =
                    response.headers.get("content-type") || "";

                const result = contentType.includes("application/json")
                    ? await response.json()
                    : {
                          message:
                              await response.text(),
                      };


                console.log(
                    "TRAINER REPORT RESPONSE:",
                    result
                );


                if (
                    !response.ok ||
                    result?.success === false
                ) {

                    throw new Error(
                        result?.message ||
                        (
                            editingId
                                ? "Failed to update Trainer report."
                                : "Failed to create Trainer report."
                        )
                    );

                }


                // =====================================
                // SUCCESS
                // =====================================

                setSuccess(
                    editingId
                        ? "Trainer Report Updated Successfully."
                        : "Trainer Report Added Successfully."
                );


                setModalError("");

                setShowModal(false);

                setEditingId(null);

                setOldPhoto1("");

                setOldPhoto2("");

                setFormData({
                    ...EMPTY_FORM,
                });


                await fetchTrainerReports();

                setCurrentUser(
                    getCurrentTrainerUser()
                );


            } catch (err) {

                console.error(
                    "TRAINER REPORT SAVE ERROR:",
                    err
                );

                const errMessage =
                    err.message ||
                    "Failed to save Trainer report.";

                setModalError(
                    errMessage
                );

                setError(
                    errMessage
                );

                if (modalBodyRef.current) {
                    modalBodyRef.current.scrollTop = 0;
                }

            } finally {

                setSubmitting(false);

            }

        };


    // =================================================
    // DELETE
    // =================================================

    const handleDelete =
        async (
            id
        ) => {

            const confirmDelete =
                window.confirm(
                    "Are you sure you want to delete this Trainer report?"
                );


            if (!confirmDelete) {
                return;
            }


            try {

                setDeletingId(id);

                setError("");

                setSuccess("");


                const response =
                    await fetch(
                        `${TRAINER_REPORTS_API}/${id}`,
                        {
                            method:
                                "DELETE",
                        }
                    );


                const contentType =
                    response.headers.get("content-type") || "";

                const result = contentType.includes("application/json")
                    ? await response.json()
                    : {
                          message:
                              await response.text(),
                      };


                if (
                    !response.ok ||
                    result?.success === false
                ) {

                    throw new Error(
                        result?.message ||
                        "Failed to delete Trainer report."
                    );

                }


                setSuccess(
                    "Trainer Report Deleted Successfully."
                );


                await fetchTrainerReports();


            } catch (err) {

                console.error(
                    "DELETE TRAINER REPORT ERROR:",
                    err
                );


                setError(
                    err.message ||
                    "Failed to delete Trainer report."
                );

            } finally {

                setDeletingId(null);

            }

        };

    // =================================================
    // LOGOUT
    // =================================================

    const handleLogout = () => {

        localStorage.clear();

        window.location.href =
            "/login";

    };


    // =================================================
    // RENDER
    // =================================================

    return (

        <div className="min-vh-100 bg-light trainer-dashboard">

            {/* =================================================
                NAVBAR
            ================================================= */}

            <nav
                className="
                    navbar
                    bg-white
                    border-bottom
                    px-4
                    py-3
                "
            >

                <div
                    className="
                        container-fluid
                        p-0
                        d-flex
                        justify-content-between
                        align-items-center
                    "
                >

                    <div>

                        <h4
                            className="
                                fw-bold
                                mb-0
                            "
                        >
                            BDO Dashboard
                        </h4>


                        <small
                            className="
                                text-muted
                            "
                        >
                            BDO (Business Development Officers) Management System
                        </small>

                    </div>


                    <div
                        className="
                            d-flex
                            align-items-center
                            gap-3
                        "
                    >

                        <div
                            className="
                                rounded-circle
                                bg-dark
                                text-white
                                d-flex
                                align-items-center
                                justify-content-center
                                fw-bold
                            "
                            style={{
                                width:
                                    "44px",

                                height:
                                    "44px",
                            }}
                        >
                            {(trainerName?.trim().charAt(0) || "B").toUpperCase()}
                        </div>


                        <div
                            className="
                                d-none
                                d-md-block
                            "
                        >

                            <div
                                className="
                                    fw-semibold
                                "
                            >
                                {
                                    trainerName ||
                                    "BDO Officer"
                                }
                            </div>


                            <small
                                className="
                                    text-muted
                                "
                            >
                                {talukaName ? `${talukaName} • ` : ""}BDO / Trainer
                            </small>

                        </div>


                        <Button
                            variant="outline-danger"
                            onClick={
                                handleLogout
                            }
                        >
                            Logout
                        </Button>

                    </div>

                </div>

            </nav>


            {/* =================================================
                CONTENT
            ================================================= */}

            <div className="container-fluid p-3 p-md-4 trainer-page">


            {/* =================================================
                HEADER
            ================================================= */}

            <div
                className="
                    d-flex
                    flex-column
                    flex-md-row
                    justify-content-between
                    align-items-start
                    align-items-md-center
                    gap-3
                    mb-4
                "
            >

                <div>

                    <h3 className="fw-bold mb-1">
                        BDO (business development officers) Reports
                    </h3>

                    <p className="text-muted mb-0">
                        Manage BDO (business development officers) reports
                    </p>

                    <div className="d-flex flex-wrap gap-2 mt-2">
                        <span className="badge bg-dark">
                            BDO (business development officers): {trainerName}
                        </span>

                        {talukaName && (
                            <span className="badge bg-secondary">
                                Taluka: {talukaName}
                            </span>
                        )}

                        {districtName && (
                            <span className="badge bg-secondary">
                                District: {districtName}
                            </span>
                        )}
                    </div>

                </div>


                <div className="d-grid d-sm-flex gap-2 w-100 w-md-auto trainer-header-actions">

                    <Button
                        variant="dark"
                        className="px-4"
                        onClick={handleAddReport}
                    >
                        + Add Report (अहवाल जोडा)
                    </Button>

                    <Button
                        variant="outline-success"
                        className="px-4"
                        onClick={handleDownloadExcel}
                        disabled={filteredReports.length === 0}
                    >
                        Download Excel
                    </Button>

                </div>

            </div>


            {/* =================================================
                ALERTS
            ================================================= */}

            {error && (

                <Alert
                    variant="danger"
                    dismissible
                    onClose={() =>
                        setError("")
                    }
                >

                    {error}

                </Alert>

            )}


            {success && (

                <Alert
                    variant="success"
                    dismissible
                    onClose={() =>
                        setSuccess("")
                    }
                >

                    {success}

                </Alert>

            )}


            {/* =================================================
                COUNT CARD
            ================================================= */}

            <div className="card border-0 shadow-sm mb-4 trainer-count-card">

                <div className="card-body">

                    <div className="d-flex align-items-center gap-3">

                        <div
                            className="
                                rounded-circle
                                bg-dark
                                text-white
                                d-flex
                                align-items-center
                                justify-content-center
                                fw-bold
                            "
                            style={{
                                width: 55,
                                height: 55,
                            }}
                        >
                            {reports.length}
                        </div>


                        <div>

                            <div className="text-muted small">
                                My BDO (business development officers) Reports
                            </div>

                            <h5 className="fw-bold mb-0">
                                {reports.length}
                            </h5>

                        </div>

                    </div>

                </div>

            </div>


            {/* =================================================
                FILTERS
            ================================================= */}

            <div className="card border-0 shadow-sm mb-4 trainer-filter-card">
                <div className="card-body">
                    <Row className="g-3">
                        <Col xs={12} md={6} lg={3}>
                            <Form.Label className="fw-semibold">Name</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Search Name..."
                                value={filterName}
                                onChange={(e) => setFilterName(e.target.value)}
                            />
                        </Col>

                        <Col xs={12} md={6} lg={3}>
                            <Form.Label className="fw-semibold">Taluka</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Search Taluka..."
                                value={filterTaluka}
                                onChange={(e) => setFilterTaluka(e.target.value)}
                            />
                        </Col>

                        <Col xs={12} md={6} lg={3}>
                            <Form.Label className="fw-semibold">District</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Search District..."
                                value={filterDistrict}
                                onChange={(e) => setFilterDistrict(e.target.value)}
                            />
                        </Col>

                        <Col xs={12} md={6} lg={3}>
                            <Form.Label className="fw-semibold">Report Date</Form.Label>
                            <Form.Control
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                        </Col>

                        <Col xs={12} md={6} lg={3}>
                            <Form.Label className="fw-semibold">Contact Number</Form.Label>
                            <Form.Control
                                type="text"
                                inputMode="numeric"
                                placeholder="Search Mobile..."
                                value={filterMobile}
                                onChange={(e) => setFilterMobile(e.target.value)}
                            />
                        </Col>

                        <Col xs={12} md={6} lg={6}>
                            <Form.Label className="fw-semibold">Search</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Search all report fields..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </Col>

                        <Col xs={12} md={6} lg={3} className="d-flex align-items-end">
                            <Button
                                variant="outline-secondary"
                                className="w-100"
                                onClick={clearAllFilters}
                            >
                                Clear Filters
                            </Button>
                        </Col>
                    </Row>
                </div>
            </div>

            {/* =================================================
                TABLE
            ================================================= */}

            <div className="card border-0 shadow-sm">

                <div className="card-header bg-white py-3">

                    <div className="d-flex justify-content-between align-items-center">

                        <h6 className="fw-bold mb-0">
                            BDO (business development officers) Report List
                        </h6>

                        <span className="badge bg-dark">
                            {filteredReports.length} Records
                        </span>

                    </div>

                </div>


                <div className="card-body p-0">

                    <div
                        className="table-responsive trainer-table-wrap"
                        style={{
                            maxHeight:
                                "calc(100vh - 330px)",
                            overflowX:
                                "auto",
                            overflowY:
                                "auto",
                        }}
                    >

                        <table
                            className="
                                table
                                table-hover
                                table-bordered
                                align-middle
                                mb-0
                                trainer-table
                            "
                            style={{
                                minWidth:
                                    "3000px",
                            }}
                        >

                            <thead
                                className="table-light"
                                style={{
                                    position:
                                        "sticky",
                                    top: 0,
                                    zIndex: 10,
                                }}
                            >

                                <tr>
                                    <th className="text-center">SR</th>
                                    <th>1 Date(दिनांक)</th>
                                    <th>2 BDO Full Name (BDO चे पूर्ण नाव)</th>
                                    <th>3 Designation (पद)</th>
                                    <th>4 Taluka Name (तालुक्याचे नाव)</th>
                                    <th>5 District Name (जिल्ह्याचे नाव)</th>
                                    <th>6 Mobile Number (मोबाईल नंबर)</th>
                                    <th className="text-center">7 Total Number of Shops Visited Today (आज प्रत्यक्ष भेट दिलेल्या दुकानांची एकूण संख्या)</th>
                                    <th className="text-center">8 Total Amount Collected from Today’s Panel Registrations (आजच्या Panel Registration मधून जमा झालेली एकूण रक्कम)</th>
                                    <th>9 Payment Mode (पेमेंट पद्धत)</th>
                                    <th className="text-center">10 Shop Photo (दुकानाचा फोटो)</th>
                                    <th className="text-center">11 Photo of the Shopkeeper’s Registration Form (दुकानदाराच्या Registration Form चा फोटो)</th>
                                    <th className="text-center">12 Today’s Work Photo / Video Proof (आजच्या कामाचे Photo / Video Proof)</th>
                                    <th className="text-center">Status</th>
                                    <th className="text-center">Action</th>
                                </tr>

                            </thead>


                            <tbody>

                                {loading && (

                                    <tr>

                                        <td
                                            colSpan="20"
                                            className="text-center py-5"
                                        >

                                            <Spinner
                                                animation="border"
                                                size="sm"
                                                className="me-2"
                                            />

                                            Loading Trainer reports...

                                        </td>

                                    </tr>

                                )}


                                {!loading &&
                                    filteredReports.length === 0 && (

                                        <tr>

                                            <td
                                                colSpan="20"
                                                className="
                                                    text-center
                                                    text-muted
                                                    py-5
                                                "
                                            >
                                                No BDO (business development officers) reports found.
                                            </td>

                                        </tr>

                                    )}


                                {!loading &&
                                    filteredReports.map(
                                        (
                                            report,
                                            index
                                        ) => {

                                            const photo1 =
                                                getPhoto1(
                                                    report
                                                );

                                            const photo2 =
                                                getPhoto2(
                                                    report
                                                );


                                            const image1 =
                                                getImageUrl(
                                                    photo1
                                                );

                                            const image2 =
                                                getImageUrl(
                                                    photo2
                                                );
                                            const image3 =
                                                getImageUrl(
                                                    report.work_photo_video
                                                );


                                            return (

                                                <tr
                                                    key={
                                                        report.id ??
                                                        index
                                                    }
                                                >

                                                    <td className="text-center">
                                                        {index + 1}
                                                    </td>

                                                    <td>
                                                        {formatDisplayDate(
                                                            report.report_date
                                                        )}
                                                    </td>

                                                    <td className="fw-semibold">
                                                        {report.name || "-"}
                                                    </td>

                                                    <td>
                                                        {report.designation || "-"}
                                                    </td>

                                                    <td>
                                                        {report.taluka || "-"}
                                                    </td>

                                                    <td>
                                                        {report.district || "-"}
                                                    </td>

                                                    <td>
                                                        {report.mobile_number || "-"}
                                                    </td>


                                                    <td className="text-center">
                                                        {report.total_shops_visited_today ?? 0}
                                                    </td>
                                                    <td className="text-center">
                                                        {report.total_panel_registration_amount ?? 0}
                                                    </td>
                                                    <td>{report.payment_mode || "-"}</td>


                                                    {/* PHOTO 1 */}

                                                    <td className="text-center">

                                                        {image1 ? (

                                                            <div>

                                                                <img
                                                                    src={
                                                                        image1
                                                                    }
                                                                    alt="Shop Photo"
                                                                    style={{
                                                                        width:
                                                                            75,
                                                                        height:
                                                                            60,
                                                                        objectFit:
                                                                            "cover",
                                                                        borderRadius:
                                                                            6,
                                                                        border:
                                                                            "1px solid #ddd",
                                                                        cursor:
                                                                            "pointer",
                                                                    }}
                                                                    onClick={() =>
                                                                        handleViewImage(
                                                                            photo1,
                                                                            "Shop Photo"
                                                                        )
                                                                    }
                                                                    onError={(
                                                                        e
                                                                    ) => {
                                                                        e.currentTarget.style.display =
                                                                            "none";
                                                                    }}
                                                                />

                                                                <div className="mt-1">

                                                                    <Button
                                                                        size="sm"
                                                                        variant="link"
                                                                        className="p-0"
                                                                        onClick={() =>
                                                                            handleViewImage(
                                                                                photo1,
                                                                                "Shop Photo"
                                                                            )
                                                                        }
                                                                    >
                                                                        View
                                                                    </Button>

                                                                </div>

                                                            </div>

                                                        ) : (

                                                            <span className="text-muted">
                                                                -
                                                            </span>

                                                        )}

                                                    </td>


                                                    {/* PHOTO 2 */}

                                                    <td className="text-center">

                                                        {image2 ? (

                                                            <div>

                                                                <img
                                                                    src={
                                                                        image2
                                                                    }
                                                                    alt="Registration Form Photo"
                                                                    style={{
                                                                        width:
                                                                            75,
                                                                        height:
                                                                            60,
                                                                        objectFit:
                                                                            "cover",
                                                                        borderRadius:
                                                                            6,
                                                                        border:
                                                                            "1px solid #ddd",
                                                                        cursor:
                                                                            "pointer",
                                                                    }}
                                                                    onClick={() =>
                                                                        handleViewImage(
                                                                            photo2,
                                                                            "Registration Form Photo"
                                                                        )
                                                                    }
                                                                    onError={(
                                                                        e
                                                                    ) => {
                                                                        e.currentTarget.style.display =
                                                                            "none";
                                                                    }}
                                                                />

                                                                <div className="mt-1">

                                                                    <Button
                                                                        size="sm"
                                                                        variant="link"
                                                                        className="p-0"
                                                                        onClick={() =>
                                                                            handleViewImage(
                                                                                photo2,
                                                                                "Registration Form Photo"
                                                                            )
                                                                        }
                                                                    >
                                                                        View
                                                                    </Button>

                                                                </div>

                                                            </div>

                                                        ) : (

                                                            <span className="text-muted">
                                                                -
                                                            </span>

                                                        )}

                                                    </td>


                                                    {/* WORK PROOF */}

                                                    <td className="text-center">
                                                        {image3 ? (
                                                            <Button
                                                                size="sm"
                                                                variant="link"
                                                                className="p-0"
                                                                onClick={() =>
                                                                    handleViewImage(
                                                                        report.work_photo_video,
                                                                        "Work Photo / Video Proof"
                                                                    )
                                                                }
                                                            >
                                                                View
                                                            </Button>
                                                        ) : (
                                                            <span className="text-muted">-</span>
                                                        )}
                                                    </td>


                                                    {/* STATUS */}

                                                    <td className="text-center">

                                                        <span className="badge bg-success">
                                                            {
                                                                report.status ||
                                                                "active"
                                                            }
                                                        </span>

                                                    </td>


                                                    {/* ACTION */}

                                                    <td className="text-center">

                                                        <div
                                                            className="
                                                                d-flex
                                                                gap-2
                                                                justify-content-center
                                                            "
                                                        >

                                                            <Button
                                                                size="sm"
                                                                variant="outline-primary"
                                                                onClick={() =>
                                                                    handleEdit(
                                                                        report
                                                                    )
                                                                }
                                                            >
                                                                Edit
                                                            </Button>


                                                            <Button
                                                                size="sm"
                                                                variant="outline-danger"
                                                                disabled={
                                                                    deletingId ===
                                                                    report.id
                                                                }
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        report.id
                                                                    )
                                                                }
                                                            >

                                                                {deletingId ===
                                                                report.id
                                                                    ? "Deleting..."
                                                                    : "Delete"}

                                                            </Button>

                                                        </div>

                                                    </td>

                                                </tr>

                                            );

                                        }
                                    )}

                            </tbody>

                        </table>

                    </div>

                </div>

            </div>


            {/* =================================================
                ADD / EDIT MODAL
            ================================================= */}

            <Modal
                show={showModal}
                onHide={handleClose}
                size="xl"
                centered
                scrollable
                backdrop="static"
            >

                <Form
                    onSubmit={
                        handleSubmit
                    }
                >

                    <Modal.Header
                        closeButton
                        className="bg-white"
                    >

                        <Modal.Title className="fw-bold">
                            {editingId
                                ? "Edit Trainer Report (प्रशिक्षक अहवाल संपादित करा)"
                                : "BDO Report format (गटविकास अधिकारी (BDO) अहवालाचा नमुना)"}
                        </Modal.Title>

                    </Modal.Header>


                    <Modal.Body
                        ref={modalBodyRef}
                        style={{
                            maxHeight: "calc(100vh - 180px)",
                            overflowY: "auto",
                        }}
                    >

                        {/* ERROR ALERT IN POPUP */}
                        {modalError && (
                            <Alert
                                variant="danger"
                                dismissible
                                onClose={() => setModalError("")}
                                className="mb-4 shadow-sm"
                            >
                                <div className="d-flex align-items-center gap-2">
                                    <span className="fw-bold">त्रुटी / Error:</span>
                                    <span>{modalError}</span>
                                </div>
                            </Alert>
                        )}

                        {/* =================================================
                            BASIC INFORMATION
                        ================================================= */}

                        <h5 className="fw-bold border-bottom pb-2 mb-3">
                            Basic Information (मूलभूत माहिती)
                        </h5>


                        <Row className="g-3">


                            {/* NAME */}

                            <Col xs={12} md={6}>

                                <Form.Group>

                                    <Form.Label className="fw-semibold">
                                        BDO Full Name (BDO चे पूर्ण नाव) *
                                    </Form.Label>

                                    <Form.Control
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="नाव"
                                        required
                                    />

                                </Form.Group>

                            </Col>


                            {/* DESIGNATION */}

                            <Col xs={12} md={6}>

                                <Form.Group>

                                    <Form.Label className="fw-semibold">
                                        Designation (पद) *
                                    </Form.Label>

                                    <Form.Control
                                        type="text"
                                        name="designation"
                                        value={formData.designation}
                                        onChange={handleChange}
                                        placeholder="पद"
                                        required
                                    />

                                </Form.Group>

                            </Col>


                            {/* TALUKA */}

                            <Col xs={12} md={6}>

                                <Form.Group>

                                    <Form.Label className="fw-semibold">
                                        Taluka (तालुका) *
                                    </Form.Label>

                                    <Form.Control
                                        type="text"
                                        name="taluka"
                                        value={formData.taluka}
                                        onChange={handleChange}
                                        placeholder="तालुका प्रविष्ट करा"
                                        required
                                    />

                                </Form.Group>

                            </Col>


                            {/* DISTRICT */}

                            <Col xs={12} md={6}>

                                <Form.Group>

                                    <Form.Label className="fw-semibold">
                                        District (जिल्हा) *
                                    </Form.Label>

                                    <Form.Control
                                        type="text"
                                        name="district"
                                        value={formData.district}
                                        onChange={handleChange}
                                        placeholder="जिल्हा प्रविष्ट करा"
                                        required
                                    />

                                </Form.Group>

                            </Col>


                            {/* MOBILE */}

                            <Col xs={12} md={6}>

                                <Form.Group>

                                    <Form.Label className="fw-semibold">
                                        Mobile Number (मोबाईल क्रमांक) *
                                    </Form.Label>

                                    <Form.Control
                                        type="tel"
                                        name="mobileNumber"
                                        value={formData.mobileNumber}
                                        onChange={handleChange}
                                        maxLength="10"
                                        placeholder="१० अंकी मोबाईल क्रमांक"
                                        required
                                    />

                                </Form.Group>

                            </Col>


                            {/* DATE */}

                            <Col xs={12} md={6}>

                                <Form.Group>

                                    <Form.Label className="fw-semibold">
                                        Report Date (अहवालाची तारीख) *
                                    </Form.Label>

                                    <Form.Control
                                        type="date"
                                        name="reportDate"
                                        value={formData.reportDate}
                                        onChange={handleChange}
                                        required
                                    />

                                </Form.Group>

                            </Col>

                        </Row>


                        <hr className="my-4" />

                        <h5 className="fw-bold border-bottom pb-2 mb-3">
                            BDO Daily Work Details (BDO दैनिक कामाचा तपशील)
                        </h5>
                        <Row className="g-3">
                            <Col xs={12} md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold">
                                        Total Number of Shops Visited Today (आज प्रत्यक्ष भेट दिलेल्या दुकानांची एकूण संख्या) *
                                    </Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="0"
                                        name="totalShopsVisitedToday"
                                        value={formData.totalShopsVisitedToday}
                                        onChange={handleChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col xs={12} md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold">
                                        Total Amount Collected from Today&apos;s Panel Registrations (आजच्या Panel Registration मधून जमा झालेली एकूण रक्कम) *
                                    </Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        name="totalPanelRegistrationAmount"
                                        value={formData.totalPanelRegistrationAmount}
                                        onChange={handleChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col xs={12} md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold">
                                        Payment Mode (पेमेंट पद्धत) *
                                    </Form.Label>
                                    <Form.Select
                                        name="paymentMode"
                                        value={formData.paymentMode}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Select payment mode</option>
                                        <option value="Cash">Cash</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Online">Online</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        {false && (
                        <>
                        {/* =================================================
                            CENTER HEADS
                        ================================================= */}

                        <h5 className="fw-bold border-bottom pb-2 mb-3">
                            Center Head Details (केंद्र प्रमुख तपशील)
                        </h5>


                        <Row className="g-3">


                            {/* AUTHORISED CENTER HEADS */}

                            <Col xs={12} md={4}>

                                <Form.Group>

                                    <Form.Label className="fw-semibold">
                                        Total Authorised Center Heads (अधिकृत केंद्र प्रमुखांची एकूण संख्या) *
                                    </Form.Label>

                                    <Form.Control
                                        type="number"
                                        min="0"
                                        name="totalAuthorisedCenterHeads"
                                        value={formData.totalAuthorisedCenterHeads}
                                        onChange={handleChange}
                                        placeholder="अधिकृत केंद्र प्रमुखांची संख्या"
                                        required
                                    />

                                </Form.Group>

                            </Col>


                            {/* ACTIVE CENTER HEADS */}

                            <Col xs={12} md={4}>

                                <Form.Group>

                                    <Form.Label className="fw-semibold">
                                        Total Active Center Heads (सक्रिय केंद्र प्रमुखांची एकूण संख्या) *
                                    </Form.Label>

                                    <Form.Control
                                        type="number"
                                        min="0"
                                        name="totalActiveCenterHeads"
                                        value={formData.totalActiveCenterHeads}
                                        onChange={handleChange}
                                        placeholder="सक्रिय केंद्र प्रमुखांची संख्या"
                                        required
                                    />

                                </Form.Group>

                            </Col>


                            {/* SANITARY PADS BOX SOLD */}

                            <Col xs={12} md={4}>

                                <Form.Group>

                                    <Form.Label className="fw-semibold">
                                        Total Sanitary Pads Box Sold Today (आज विकलेले एकूण सॅनिटरी पॅड बॉक्स) *
                                    </Form.Label>

                                    <Form.Control
                                        type="number"
                                        min="0"
                                        name="totalSanitaryPadBoxesSoldToday"
                                        value={formData.totalSanitaryPadBoxesSoldToday}
                                        onChange={handleChange}
                                        placeholder="पॅड बॉक्स संख्या"
                                        required
                                    />

                                </Form.Group>

                            </Col>


                            {/* SALES AMOUNT */}

                            <Col xs={12} md={6}>

                                <Form.Group>

                                    <Form.Label className="fw-semibold">
                                        Total Amount from Sanitary Pad Box Sales Today (आजच्या सॅनिटरी पॅड बॉक्स विक्रीतून एकूण रक्कम) *
                                    </Form.Label>

                                    <Form.Control
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        name="totalAmountFromSanitaryPadSalesToday"
                                        value={formData.totalAmountFromSanitaryPadSalesToday}
                                        onChange={handleChange}
                                        placeholder="एकूण रक्कम"
                                        required
                                    />

                                </Form.Group>

                            </Col>


                            {/* UTR NUMBER */}

                            <Col xs={12} md={6}>

                                <Form.Group>

                                    <Form.Label className="fw-semibold">
                                        UTR Number (युटीआर क्रमांक) *
                                    </Form.Label>

                                    <Form.Control
                                        type="text"
                                        name="utrNumber"
                                        value={formData.utrNumber}
                                        onChange={handleChange}
                                        placeholder="UTR क्रमांक प्रविष्ट करा"
                                        required
                                    />

                                </Form.Group>

                            </Col>


                            {/* VISITED CENTER HEADS COUNT */}

                            <Col xs={12} md={4}>

                                <Form.Group>

                                    <Form.Label className="fw-semibold">
                                        Total Center Heads Visited Today (आज भेट दिलेले एकूण केंद्र प्रमुख) *
                                    </Form.Label>

                                    <Form.Control
                                        type="number"
                                        min="0"
                                        name="totalCenterHeadsVisitedToday"
                                        value={formData.totalCenterHeadsVisitedToday}
                                        onChange={handleChange}
                                        placeholder="भेट दिलेले केंद्र प्रमुख संख्या"
                                        required
                                    />

                                </Form.Group>

                            </Col>


                            {/* VISITED CENTER HEADS NAMES */}

                            <Col xs={12}>

                                <Form.Group>

                                    <Form.Label className="fw-semibold">
                                        Today's Visited Center Heads Names (आज भेट दिलेल्या केंद्र प्रमुखांची नावे) *
                                    </Form.Label>

                                    <Form.Control
                                        as="textarea"
                                        rows={4}
                                        name="todayVisitedCenterHeadsNames"
                                        value={formData.todayVisitedCenterHeadsNames}
                                        onChange={handleChange}
                                        placeholder="आज भेट दिलेल्या केंद्र प्रमुखांची नावे प्रविष्ट करा..."
                                        required
                                    />

                                </Form.Group>

                            </Col>


                            {/* TODAY'S NEW MEMBERS */}

                            <Col xs={12} md={6}>

                                <Form.Group>

                                    <Form.Label className="fw-semibold">
                                        Today's New Members (आज जोडलेले नवीन सदस्य) *
                                    </Form.Label>

                                    <Form.Control
                                        type="number"
                                        min="0"
                                        name="todaysNewMembers"
                                        value={formData.todaysNewMembers}
                                        onChange={handleChange}
                                        placeholder="नवीन सदस्य संख्या"
                                        required
                                    />

                                </Form.Group>

                            </Col>


                            {/* ADDITIONAL REMARKS */}

                            <Col xs={12}>

                                <Form.Group>

                                    <Form.Label className="fw-semibold">
                                        Additional Remarks (इतर माहिती / शेरा)
                                    </Form.Label>

                                    <Form.Control
                                        as="textarea"
                                        rows={4}
                                        name="additionalRemarks"
                                        value={formData.additionalRemarks}
                                        onChange={handleChange}
                                        placeholder="इतर माहिती / शेरा प्रविष्ट करा..."
                                    />

                                </Form.Group>

                            </Col>

                        </Row>


                        <hr className="my-4" />


                        {/* =================================================
                            PHOTOS
                        ================================================= */}

                        <h5 className="fw-bold border-bottom pb-2 mb-3">
                            Meeting Photos (बैठकीचे फोटो)
                        </h5>


                        <Row className="g-4">


                            {/* PHOTO 1 */}

                            <Col xs={12} md={6}>

                                <Form.Group>

                                    <Form.Label className="fw-semibold">
                                        Meeting Photo 1 (बैठक फोटो १)
                                        {!editingId && " *"}
                                    </Form.Label>

                                    <Form.Control
                                        type="file"
                                        name="meetingPhoto1"
                                        accept="image/jpeg,image/jpg,image/png,image/webp"
                                        onChange={handleChange}
                                    />

                                    <Form.Text className="text-muted">
                                        JPG, JPEG, PNG or WEBP — Maximum 10MB
                                    </Form.Text>


                                    {/* OLD */}

                                    {editingId && oldPhoto1 && !formData.meetingPhoto1 && (

                                        <div className="mt-3">

                                            <small className="text-muted d-block fw-bold mb-2">
                                                Current Photo 1 (सध्याचा फोटो १)
                                            </small>

                                            <img
                                                src={getImageUrl(oldPhoto1)}
                                                alt="Current Photo 1"
                                                style={{
                                                    width: 150,
                                                    height: 100,
                                                    objectFit: "cover",
                                                    borderRadius: 8,
                                                    border: "1px solid #ddd",
                                                }}
                                            />

                                            <div className="mt-2">

                                                <Button
                                                    size="sm"
                                                    variant="outline-dark"
                                                    type="button"
                                                    onClick={() =>
                                                        handleViewImage(
                                                            oldPhoto1,
                                                            "Current Meeting Photo 1"
                                                        )
                                                    }
                                                >
                                                    View
                                                </Button>

                                            </div>

                                        </div>

                                    )}


                                    {/* NEW */}

                                    {formData.meetingPhoto1 && (

                                        <div className="mt-3">

                                            <small className="text-success d-block fw-bold mb-2">
                                                New Photo 1 (नवीन फोटो १)
                                            </small>

                                            <img
                                                src={URL.createObjectURL(formData.meetingPhoto1)}
                                                alt="New Photo 1"
                                                style={{
                                                    width: 150,
                                                    height: 100,
                                                    objectFit: "cover",
                                                    borderRadius: 8,
                                                    border: "1px solid #ddd",
                                                }}
                                            />

                                        </div>

                                    )}


                                    {editingId && (

                                        <Form.Text className="text-muted d-block mt-2">
                                            New photo select केली नाही तर जुना photo कायम राहील.
                                        </Form.Text>

                                    )}

                                </Form.Group>

                            </Col>


                            {/* PHOTO 2 */}

                            <Col xs={12} md={6}>

                                <Form.Group>

                                    <Form.Label className="fw-semibold">
                                        Meeting Photo 2 (बैठक फोटो २)
                                        {!editingId && " *"}
                                    </Form.Label>

                                    <Form.Control
                                        type="file"
                                        name="meetingPhoto2"
                                        accept="image/jpeg,image/jpg,image/png,image/webp"
                                        onChange={handleChange}
                                    />

                                    <Form.Text className="text-muted">
                                        JPG, JPEG, PNG or WEBP — Maximum 10MB
                                    </Form.Text>


                                    {/* OLD */}

                                    {editingId && oldPhoto2 && !formData.meetingPhoto2 && (

                                        <div className="mt-3">

                                            <small className="text-muted d-block fw-bold mb-2">
                                                Current Photo 2 (सध्याचा फोटो २)
                                            </small>

                                            <img
                                                src={getImageUrl(oldPhoto2)}
                                                alt="Current Photo 2"
                                                style={{
                                                    width: 150,
                                                    height: 100,
                                                    objectFit: "cover",
                                                    borderRadius: 8,
                                                    border: "1px solid #ddd",
                                                }}
                                            />

                                            <div className="mt-2">

                                                <Button
                                                    size="sm"
                                                    variant="outline-dark"
                                                    type="button"
                                                    onClick={() =>
                                                        handleViewImage(
                                                            oldPhoto2,
                                                            "Current Meeting Photo 2"
                                                        )
                                                    }
                                                >
                                                    View
                                                </Button>

                                            </div>

                                        </div>

                                    )}


                                    {/* NEW */}

                                    {formData.meetingPhoto2 && (

                                        <div className="mt-3">

                                            <small className="text-success d-block fw-bold mb-2">
                                                New Photo 2 (नवीन फोटो २)
                                            </small>

                                            <img
                                                src={URL.createObjectURL(formData.meetingPhoto2)}
                                                alt="New Photo 2"
                                                style={{
                                                    width: 150,
                                                    height: 100,
                                                    objectFit: "cover",
                                                    borderRadius: 8,
                                                    border: "1px solid #ddd",
                                                }}
                                            />

                                        </div>

                                    )}


                                    {editingId && (

                                        <Form.Text className="text-muted d-block mt-2">
                                            New photo select केली नाही तर जुना photo कायम राहील.
                                        </Form.Text>

                                    )}

                                </Form.Group>

                            </Col>

                        </Row>
                        </>
                        )}

                    </Modal.Body>


                    {/* =================================================
                        FOOTER
                    ================================================= */}

                    <Modal.Footer
                        className="bg-white border-top"
                        style={{
                            position: "sticky",
                            bottom: 0,
                            zIndex: 30,
                        }}
                    >

                        {!editingId && (
                            <Button
                                variant="outline-danger"
                                type="button"
                                className="me-auto"
                                onClick={() => {
                                    const today =
                                        new Date()
                                            .toISOString()
                                            .split("T")[0];
                                    setFormData({
                                        ...EMPTY_FORM,
                                        name: trainerName,
                                        designation: "BDO",
                                        taluka: talukaName || "",
                                        district: districtName || "",
                                        mobileNumber:
                                            localStorage.getItem("logged_in_mobile") || "",
                                        reportDate: today,
                                    });
                                    setModalError("");
                                }}
                                disabled={submitting}
                            >
                                Reset Form (फॉर्म रीसेट करा)
                            </Button>
                        )}

                        <Button
                            variant="secondary"
                            type="button"
                            onClick={handleClose}
                            disabled={submitting}
                        >
                            Cancel (रद्द करा)
                        </Button>


                        <Button
                            variant="dark"
                            type="submit"
                            disabled={submitting}
                        >

                            {submitting ? (

                                <>
                                    <Spinner
                                        size="sm"
                                        animation="border"
                                        className="me-2"
                                    />

                                    {editingId
                                        ? "Updating..."
                                        : "Saving..."}
                                </>

                            ) : (

                                editingId
                                    ? "Update Report (अद्यतनित करा)"
                                    : "Add Report (जोडा)"

                            )}

                        </Button>

                    </Modal.Footer>

                </Form>

            </Modal>


            {/* =================================================
                IMAGE VIEW MODAL
            ================================================= */}

            <Modal
                show={
                    showImageModal
                }
                onHide={
                    handleCloseImage
                }
                centered
                size="lg"
            >

                <Modal.Header
                    closeButton
                >

                    <Modal.Title>
                        {selectedImageTitle}
                    </Modal.Title>

                </Modal.Header>


                <Modal.Body className="text-center p-3">

                    {selectedImage && (

                        <img
                            src={
                                selectedImage
                            }
                            alt={
                                selectedImageTitle
                            }
                            style={{
                                maxWidth:
                                    "100%",
                                maxHeight:
                                    "70vh",
                                objectFit:
                                    "contain",
                                borderRadius:
                                    8,
                            }}
                        />

                    )}

                </Modal.Body>

            </Modal>


            {/* =================================================
                CUSTOM CSS
            ================================================= */}

            <style>{`

                .table-responsive {
                    width: 100%;
                    overflow-x: auto !important;
                    overflow-y: auto !important;
                    -webkit-overflow-scrolling: touch;
                }

                .table th,
                .table td {
                    font-size: 12px;
                    padding: 9px 10px;
                    vertical-align: middle;
                }

                .table th {
                    white-space: nowrap;
                    font-weight: 700;
                }

                .table td {
                    line-height: 1.4;
                }

                .table-responsive::-webkit-scrollbar {
                    width: 8px;
                    height: 9px;
                }

                .table-responsive::-webkit-scrollbar-track {
                    background: #f1f3f5;
                }

                .table-responsive::-webkit-scrollbar-thumb {
                    background: #adb5bd;
                    border-radius: 10px;
                }

                .table-responsive::-webkit-scrollbar-thumb:hover {
                    background: #6c757d;
                }

                .modal-dialog {
                    max-width: 1200px;
                }

                .modal-content {
                    border: 0;
                    border-radius: 12px;
                    overflow: hidden;
                }

                .modal-body {
                    background: #fff;
                }

                @media (max-width: 768px) {

                    .modal-dialog {
                        margin: 8px;
                    }

                    .modal-body {
                        padding: 16px;
                    }

                    .table th,
                    .table td {
                        font-size: 11px;
                    }

                }



                .trainer-page {
                    width: 100%;
                    min-width: 0;
                }

                .trainer-page .trainer-table-wrap {
                    width: 100%;
                    overflow-x: auto !important;
                    overflow-y: auto !important;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: thin;
                }

                .trainer-page .trainer-table {
                    min-width: 2100px;
                }

                .trainer-page .trainer-table th,
                .trainer-page .trainer-table td {
                    white-space: nowrap;
                    vertical-align: middle;
                }

                .trainer-page .trainer-filter-card .form-control {
                    min-height: 42px;
                }

                @media (max-width: 991.98px) {
                    .trainer-page .trainer-table-wrap {
                        max-height: 60vh !important;
                    }
                }

                @media (max-width: 767.98px) {
                    .trainer-page {
                        padding-bottom: 20px;
                    }

                    .trainer-page .trainer-header-actions {
                        width: 100%;
                    }

                    .trainer-page .trainer-header-actions .btn {
                        width: 100%;
                    }

                    .trainer-page .trainer-count-card .card-body {
                        padding: 16px;
                    }

                    .trainer-page .trainer-table-wrap {
                        max-height: 55vh !important;
                    }

                    .trainer-page .trainer-table {
                        min-width: 1900px;
                    }

                    .navbar {
                        padding-left: 12px !important;
                        padding-right: 12px !important;
                    }
                }
            `}</style>

            </div>

        </div>

    );

};


export default TrainerDashboard;    