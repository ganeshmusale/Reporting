import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Button,
    Modal,
    Form,
    Alert,
    Spinner,
} from "react-bootstrap";
import { API_BASE_URL, BACKEND_ROOT_URL } from "../../config/api";


// =====================================================
// API
// =====================================================

const BACKEND_ORIGIN = BACKEND_ROOT_URL;

const REPORT_API_URLS = [
    `${API_BASE_URL}/taluka-reports`,
];

const BACKEND_URL =
    `${BACKEND_ORIGIN}/api`;

const TALUKA_UPLOAD_URL =
    `${BACKEND_URL}/uploads/taluka-reports`;


// =====================================================
// API REQUEST HELPER
// =====================================================

const requestTalukaReport = async (
    path = "",
    options = {}
) => {

    let lastError = null;

    for (const baseUrl of REPORT_API_URLS) {

        const url =
            `${baseUrl}${path}`;

        try {

            const response =
                await fetch(
                    url,
                    options
                );

            if (
                response.status === 404
            ) {

                lastError =
                    new Error(
                        `Endpoint not found: ${url}`
                    );

                continue;
            }

            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";

            const data =
                contentType.includes(
                    "application/json"
                )
                    ? await response.json()
                    : await response.text();

            return {
                response,
                data,
                url,
            };

        } catch (error) {

            lastError = error;

        }

    }

    throw (
        lastError ||
        new Error(
            "Unable to connect to the backend server."
        )
    );
};


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

    // =================================================
    // CENTER HEAD DETAILS
    // =================================================

    totalAuthorisedCenterHeads: "",

    totalActiveCenterHeads: "",

    // =================================================
    // TODAY VISITED
    // =================================================

    namesOfCenterHeadsVisitedToday: "",

    // =================================================
    // SANITARY PAD DETAILS
    // =================================================

    totalSanitaryPadsBoxSoldToday: "",

    totalAmountFromSanitaryPadBoxSalesToday: "",

    // =================================================
    // OTHER
    // =================================================

    utrNumber: "",

    additionalRemarks: "",

    // =================================================
    // PHOTOS
    // =================================================

    meetingPhoto1: null,

    meetingPhoto2: null,

};


// =====================================================
// NORMALIZE
// =====================================================

const normalize = (value) => {

    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();

};


// =====================================================
// DATE FORMAT
// =====================================================

const formatDate = (value) => {

    if (!value) {

        return "";

    }

    const dateValue =
        String(value)
            .split("T")[0];

    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            dateValue
        )
    ) {

        const [
            year,
            month,
            day,
        ] =
            dateValue.split("-");

        return `${day}-${month}-${year}`;

    }

    return dateValue;

};


// =====================================================
// DATE FOR INPUT
// =====================================================

const formatDateForInput = (value) => {

    if (!value) {

        return "";

    }

    return String(value)
        .split("T")[0];

};


// =====================================================
// IMAGE URL
// =====================================================

const getImageUrl = (fileName) => {

    if (!fileName) {

        return "";

    }

    let value =
        String(fileName).trim();

    if (!value) {

        return "";

    }


    // COMPLETE URL

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

        return `${BACKEND_URL}${value}`;

    }


    // uploads/...

    if (
        value.startsWith(
            "uploads/taluka-reports/"
        )
    ) {

        return `${BACKEND_URL}/${value}`;

    }


    // taluka-reports/...

    if (
        value.startsWith(
            "taluka-reports/"
        )
    ) {

        return `${BACKEND_URL}/uploads/${value}`;

    }


    // ONLY FILE NAME

    return `${TALUKA_UPLOAD_URL}/${value}`;

};


// =====================================================
// PHOTO 1
// =====================================================

const getPhoto1 = (report) => {

    return (

        report?.meeting_photo_1 ||

        report?.meetingPhoto1 ||

        report?.meeting_photo1 ||

        report?.photo_1 ||

        report?.photo1 ||

        ""

    );

};


// =====================================================
// PHOTO 2
// =====================================================

const getPhoto2 = (report) => {

    return (

        report?.meeting_photo_2 ||

        report?.meetingPhoto2 ||

        report?.meeting_photo2 ||

        report?.photo_2 ||

        report?.photo2 ||

        ""

    );

};


// =====================================================
// CURRENT USER
// =====================================================

const getCurrentTalukaUser = () => {

    return {

        name:
            localStorage.getItem(
                "logged_in_name"
            ) || "Taluka Head",

        userId:
            localStorage.getItem(
                "logged_in_user_id"
            ) ||
            localStorage.getItem(
                "user_id"
            ) ||
            "",

        taluka:
            localStorage.getItem(
                "logged_in_taluka_name"
            ) || "",

        district:
            localStorage.getItem(
                "logged_in_district_name"
            ) || "",

        talukaId:
            localStorage.getItem(
                "logged_in_taluka_id"
            ) || "",

        districtId:
            localStorage.getItem(
                "logged_in_district_id"
            ) || "",

    };

};


// =====================================================
// COMPONENT
// =====================================================

const TalukaDashboard = () => {


    // =================================================
    // CURRENT USER
    // =================================================

    const [
        currentUser,
        setCurrentUser,
    ] = useState(
        getCurrentTalukaUser()
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
    // DELETING
    // =================================================

    const [
        deletingId,
        setDeletingId,
    ] = useState(null);


    // =================================================
    // ERROR
    // =================================================

    const [
        errorMessage,
        setErrorMessage,
    ] = useState("");


    // =================================================
    // SUCCESS
    // =================================================

    const [
        successMessage,
        setSuccessMessage,
    ] = useState("");


    // =================================================
    // MODAL
    // =================================================

    const [
        showModal,
        setShowModal,
    ] = useState(false);


    // =================================================
    // EDIT ID
    // =================================================

    const [
        editingId,
        setEditingId,
    ] = useState(null);


    // =================================================
    // OLD PHOTOS
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
    // SEARCH
    // =================================================

    const [
        search,
        setSearch,
    ] = useState("");


    // =================================================
    // FILTERS
    // =================================================

    const [
        filters,
        setFilters,
    ] = useState({

        name: "",

        taluka: "",

        district: "",

        report_date: "",

    });


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


    // =================================================
    // USER VALUES
    // =================================================

    const talukaName =
        currentUser?.taluka || "";


    const districtName =
        currentUser?.district || "";


    const userName =
        currentUser?.name ||
        "Taluka Head";


    // =================================================
    // LOAD REPORTS
    // =================================================

    const loadReports = async () => {

        try {

            setLoading(true);

            setErrorMessage("");

            // Build role-based query params so backend filters by logged-in user
            const loggedRole   = (localStorage.getItem("logged_in_role") || "").toLowerCase();
            const loggedUserId = localStorage.getItem("logged_in_user_id") || localStorage.getItem("user_id") || "";
            const loggedMobile = localStorage.getItem("logged_in_mobile")  || "";
            const loggedName   = localStorage.getItem("logged_in_name")    || "";
            const isAdmin      = loggedRole === "admin" || loggedRole === "superadmin";

            let queryPath = "";
            if (!isAdmin && loggedUserId) {
                const params = new URLSearchParams();
                params.set("role", loggedRole);
                params.set("user_id", loggedUserId);
                if (loggedMobile) params.set("mobile_number", loggedMobile);
                if (loggedName) params.set("user_name", loggedName);
                queryPath = `?${params.toString()}`;
            }

            const {
                response,
                data,
                url,
            } =
                await requestTalukaReport(queryPath);


            console.log(
                "GET TALUKA REPORTS:",
                url
            );


            if (
                !response.ok ||
                data.success === false
            ) {

                throw new Error(
                    data.message ||
                    "Failed to load Taluka reports."
                );

            }


            const list =
                Array.isArray(
                    data.reports
                )
                    ? data.reports
                    : Array.isArray(
                        data.data
                    )
                        ? data.data
                        : [];


            console.log(
                "TALUKA REPORTS COUNT:",
                list.length,
                list
            );


            setReports(list);

        } catch (error) {

            console.error(
                "LOAD TALUKA REPORTS:",
                error
            );


            setErrorMessage(
                error.message ||
                "Failed to load reports."
            );

        } finally {

            setLoading(false);

        }

    };


    // =================================================
    // INITIAL LOAD
    // =================================================

    useEffect(() => {

        loadReports();


        const reload = () => {

            setCurrentUser(
                getCurrentTalukaUser()
            );

            loadReports();

        };


        window.addEventListener(
            "reportsChanged",
            reload
        );


        window.addEventListener(
            "reportAdded",
            reload
        );


        window.addEventListener(
            "reportUpdated",
            reload
        );


        return () => {

            window.removeEventListener(
                "reportsChanged",
                reload
            );


            window.removeEventListener(
                "reportAdded",
                reload
            );


            window.removeEventListener(
                "reportUpdated",
                reload
            );

        };

    }, []);


    // =================================================
    // TALUKA REPORTS
    // =================================================

    const talukaReports =
        useMemo(() => {

            if (!Array.isArray(reports)) {
                return [];
            }

            // =================================================
            // ONLY LOGGED-IN USER'S REPORTS
            // =================================================
            // New reports can contain created_by_id.
            // Existing reports use created_by = logged-in name.
            // =================================================

            const role = (localStorage.getItem("logged_in_role") || "").toLowerCase();
            const isAdmin = role === "admin" || role === "superadmin";
            if (isAdmin) {
                return reports;
            }

            const loggedInUserId = normalize(currentUser?.userId);
            const loggedInUserName = normalize(currentUser?.name);
            const loggedInMobile = normalize(currentUser?.mobileNumber || localStorage.getItem("logged_in_mobile"));

            const filtered = reports.filter((report) => {
                const reportUserId = normalize(
                    report?.user_id ??
                    report?.created_by_id ??
                    report?.createdById ??
                    report?.userId
                );

                // Owned row → exact user_id only
                if (reportUserId) {
                    return Boolean(loggedInUserId) && reportUserId === loggedInUserId;
                }

                // Legacy unowned → created_by must match login id or name, or mobile
                const reportCreatedBy = normalize(
                    report?.created_by ??
                    report?.createdBy ??
                    report?.created_by_name ??
                    report?.createdByName
                );
                if (reportCreatedBy) {
                    if (loggedInUserId && reportCreatedBy === loggedInUserId) return true;
                    if (loggedInUserName && reportCreatedBy === loggedInUserName) return true;
                }

                const reportMobile = normalize(report?.mobile_number ?? report?.mobileNumber);
                if (loggedInMobile && reportMobile && reportMobile === loggedInMobile) {
                    return true;
                }

                return false;
            });

            return filtered;

        }, [
            reports,
            currentUser?.userId,
            currentUser?.name,
            currentUser?.mobileNumber,
        ]);


    // =================================================
    // SEARCH + FILTERS
    // =================================================

    const filteredReports =
        useMemo(() => {

            const globalKeyword =
                normalize(search);


            const nameKeyword =
                normalize(
                    filters.name
                );


            const talukaKeyword =
                normalize(
                    filters.taluka
                );


            const districtKeyword =
                normalize(
                    filters.district
                );


            const dateKeyword =
                String(
                    filters.report_date ||
                    ""
                ).trim();


            return talukaReports.filter(
                (report) => {

                    const matchesGlobal =
                        !globalKeyword ||
                        [

                            report?.name,

                            report?.designation,

                            report?.taluka,

                            report?.district,

                            report?.mobile_number,

                            report?.mobileNumber,

                            report?.report_date,

                            report?.reportDate,

                            report?.utr_number,

                            report?.utrNumber,

                            report?.status,

                        ].some(
                            (value) =>
                                normalize(
                                    value
                                ).includes(
                                    globalKeyword
                                )
                        );


                    const matchesName =
                        !nameKeyword ||
                        normalize(
                            report?.name
                        ).includes(
                            nameKeyword
                        );


                    const matchesTaluka =
                        !talukaKeyword ||
                        normalize(
                            report?.taluka
                        ).includes(
                            talukaKeyword
                        );


                    const matchesDistrict =
                        !districtKeyword ||
                        normalize(
                            report?.district
                        ).includes(
                            districtKeyword
                        );


                    const reportDate =
                        String(
                            report?.report_date ||
                            report?.reportDate ||
                            ""
                        ).split("T")[0];


                    const matchesDate =
                        !dateKeyword ||
                        reportDate ===
                            dateKeyword;


                    return (

                        matchesGlobal &&

                        matchesName &&

                        matchesTaluka &&

                        matchesDistrict &&

                        matchesDate

                    );

                }
            );

        }, [
            talukaReports,
            search,
            filters,
        ]);


    // =================================================
    // FILTER CHANGE
    // =================================================

    const handleFilterChange = (
        event
    ) => {

        const {
            name,
            value,
        } = event.target;


        setFilters(
            (prev) => ({

                ...prev,

                [name]: value,

            })
        );

    };


    // =================================================
    // CLEAR FILTERS
    // =================================================

    const clearFilters = () => {

        setSearch("");

        setFilters({

            name: "",

            taluka: "",

            district: "",

            report_date: "",

        });

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


        // FILE

        if (
            type === "file"
        ) {

            const file =
                files?.[0] || null;


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

            ];


            if (
                !allowedTypes.includes(
                    file.type
                )
            ) {

                alert(
                    "Only JPG, JPEG, PNG and WEBP images are allowed."
                );


                event.target.value =
                    "";

                return;

            }


            if (
                file.size >
                10 * 1024 * 1024
            ) {

                alert(
                    "Image size must be less than 10MB."
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


        // TEXT

        setFormData(
            (prev) => ({

                ...prev,

                [name]: value,

            })
        );

    };


    // =================================================
    // ADD REPORT
    // =================================================

    const handleOpenAddReport =
        () => {

            setEditingId(null);

            setOldPhoto1("");

            setOldPhoto2("");


            setFormData({

                ...EMPTY_FORM,

                name:
                    userName,

                designation:
                    "Taluka Head",

                taluka:
                    talukaName,

                district:
                    districtName,

                reportDate:
                    new Date()
                        .toISOString()
                        .split("T")[0],

            });


            setErrorMessage("");

            setSuccessMessage("");

            setShowModal(true);

        };


    // =================================================
    // EDIT REPORT
    // =================================================

    const handleEditReport =
        (report) => {

            setEditingId(
                report.id
            );


            const photo1 =
                getPhoto1(report);


            const photo2 =
                getPhoto2(report);


            setOldPhoto1(
                getImageUrl(photo1)
            );


            setOldPhoto2(
                getImageUrl(photo2)
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
                    report.mobile_number ||
                    report.mobileNumber ||
                    "",

                reportDate:
                    formatDateForInput(
                        report.report_date ||
                        report.reportDate
                    ),


                // =================================================
                // AUTHORISED CENTER HEAD
                // =================================================

                totalAuthorisedCenterHeads:

                    report.total_authorised_center_heads ??

                    report.total_authorised_center_heads_50 ??

                    report.total_center_heads ??

                    report.totalCenterHeads ??

                    "",


                // =================================================
                // ACTIVE CENTER HEAD
                // =================================================

                totalActiveCenterHeads:

                    report.total_active_center_heads ??

                    report.totalActiveCenterHeads ??

                    "",


                // =================================================
                // VISITED CENTER HEADS
                // =================================================

                namesOfCenterHeadsVisitedToday:

                    report.visited_center_heads_names ||

                    report.names_of_center_heads_visited_today ||

                    report.namesOfCenterHeadsVisitedToday ||

                    "",


                // =================================================
                // SANITARY PADS
                // =================================================

                totalSanitaryPadsBoxSoldToday:

                    report.sanitary_pads_boxes_sold ??

                    report.total_sanitary_pads_box_sold_today ??

                    report.totalSanitaryPadsBoxSoldToday ??

                    "",


                // =================================================
                // SALES AMOUNT
                // =================================================

                totalAmountFromSanitaryPadBoxSalesToday:

                    report.sanitary_pads_sales_amount ??

                    report.total_amount_from_sanitary_pad_box_sales_today ??

                    report.totalAmountFromSanitaryPadBoxSalesToday ??

                    "",


                // =================================================
                // UTR
                // =================================================

                utrNumber:

                    report.utr_number ||

                    report.utrNumber ||

                    "",


                // =================================================
                // REMARKS
                // =================================================

                additionalRemarks:

                    report.additional_remarks ||

                    report.additionalRemarks ||

                    "",


                meetingPhoto1:
                    null,

                meetingPhoto2:
                    null,

            });


            setErrorMessage("");

            setSuccessMessage("");

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

        setEditingId(null);

        setOldPhoto1("");

        setOldPhoto2("");


        setFormData({
            ...EMPTY_FORM,
        });

    };


    // =================================================
    // VIEW IMAGE
    // =================================================

    const handleViewImage =
        (image) => {

            if (!image) {

                return;

            }


            setSelectedImage(
                image
            );

            setShowImageModal(true);

        };


    // =================================================
    // SUBMIT
    // =================================================

    const handleSubmit =
        async (
            event
        ) => {

            event.preventDefault();


            // =================================================
            // VALIDATION
            // =================================================

            if (
                !formData.name.trim()
            ) {

                alert(
                    "Please enter Name."
                );

                return;

            }


            if (
                !formData.designation.trim()
            ) {

                alert(
                    "Please enter Designation."
                );

                return;

            }


            if (
                !formData.taluka.trim()
            ) {

                alert(
                    "Please enter Taluka."
                );

                return;

            }


            if (
                !formData.district.trim()
            ) {

                alert(
                    "Please enter District."
                );

                return;

            }


            const cleanMobile = String(formData.mobileNumber || "")
                .trim()
                .replace(/^(\+91|91)/, "")
                .replace(/\D/g, "");

            if (!cleanMobile || cleanMobile.length !== 10) {
                alert(
                    "Please enter valid 10 digit mobile number."
                );
                return;
            }


            if (
                !formData.reportDate
            ) {

                alert(
                    "Please select Report Date."
                );

                return;

            }


            try {

                setSubmitting(true);

                setErrorMessage("");

                setSuccessMessage("");


                // =================================================
                // FORMDATA
                // =================================================

                const body =
                    new FormData();


                // =================================================
                // BASIC
                // =================================================

                body.append(
                    "name",
                    formData.name.trim()
                );


                body.append(
                    "designation",
                    formData.designation.trim()
                );


                body.append(
                    "taluka",
                    formData.taluka.trim()
                );


                body.append(
                    "district",
                    formData.district.trim()
                );


                body.append(
                    "mobile_number",
                    cleanMobile
                );


                body.append(
                    "report_date",
                    formData.reportDate
                );


                // =================================================
                // TOTAL AUTHORISED CENTER HEAD
                // =================================================

                body.append(
                    "total_authorised_center_heads",
                    String(
                        formData.totalAuthorisedCenterHeads ||
                        "0"
                    )
                );


                // =================================================
                // TOTAL ACTIVE CENTER HEAD
                // =================================================

                body.append(
                    "total_active_center_heads",
                    String(
                        formData.totalActiveCenterHeads ||
                        "0"
                    )
                );


                // =================================================
                // TODAY'S VISITED CENTER HEADS
                // =================================================

                body.append(
                    "visited_center_heads_names",
                    String(
                        formData.namesOfCenterHeadsVisitedToday ||
                        ""
                    ).trim()
                );


                // =================================================
                // SANITARY PADS BOX SOLD
                // =================================================

                body.append(
                    "sanitary_pads_boxes_sold",
                    String(
                        formData.totalSanitaryPadsBoxSoldToday ||
                        "0"
                    )
                );


                // =================================================
                // SANITARY PAD SALES AMOUNT
                // =================================================

                body.append(
                    "sanitary_pads_sales_amount",
                    String(
                        formData.totalAmountFromSanitaryPadBoxSalesToday ||
                        "0"
                    )
                );


                // =================================================
                // UTR
                // =================================================

                body.append(
                    "utr_number",
                    String(
                        formData.utrNumber ||
                        ""
                    ).trim()
                );


                // =================================================
                // ADDITIONAL REMARKS
                // =================================================

                body.append(
                    "additional_remarks",
                    String(
                        formData.additionalRemarks ||
                        ""
                    ).trim()
                );


                // =================================================
                // USER INFORMATION
                // =================================================

                body.append(
                    "role",
                    "taluka"
                );


                body.append(
                    "created_by_role",
                    "taluka"
                );


                body.append(
                    "created_by",
                    userName
                );

                body.append(
                    "updated_by",
                    userName
                );

                if (currentUser?.userId) {
                    body.append(
                        "user_id",
                        currentUser.userId
                    );
                    body.append(
                        "created_by_id",
                        currentUser.userId
                    );
                    body.append(
                        "updated_by_id",
                        currentUser.userId
                    );
                }


                body.append(
                    "taluka_id",
                    currentUser?.talukaId ||
                    ""
                );


                body.append(
                    "district_id",
                    currentUser?.districtId ||
                    ""
                );


                // =================================================
                // REQUEST
                // =================================================

                const {
                    response,
                    data,
                    url,
                } =
                    await requestTalukaReport(

                        editingId
                            ? `/${editingId}`
                            : "",

                        {

                            method:
                                editingId
                                    ? "PUT"
                                    : "POST",

                            body,

                        }

                    );


                console.log(
                    "SAVE TALUKA REPORT:",
                    url
                );


                if (
                    !response.ok ||
                    data.success === false
                ) {

                    throw new Error(
                        data.message ||
                        "Failed to save Taluka report."
                    );

                }


                // =================================================
                // RELOAD
                // =================================================

                await loadReports();


                // =================================================
                // EVENTS
                // =================================================

                window.dispatchEvent(
                    new Event(
                        "reportsChanged"
                    )
                );


                window.dispatchEvent(
                    new Event(
                        editingId
                            ? "reportUpdated"
                            : "reportAdded"
                    )
                );


                const wasEditing =
                    Boolean(
                        editingId
                    );


                // =================================================
                // CLOSE
                // =================================================

                setShowModal(false);

                setEditingId(null);

                setFormData({
                    ...EMPTY_FORM,
                });

                setOldPhoto1("");

                setOldPhoto2("");


                setSuccessMessage(

                    wasEditing

                        ? "Taluka report updated successfully."

                        : "Taluka report added successfully."

                );


            } catch (error) {

                console.error(
                    "SAVE TALUKA REPORT:",
                    error
                );


                setErrorMessage(
                    error.message ||
                    "Failed to save report."
                );

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

            if (!id) {

                return;

            }


            const confirmed =
                window.confirm(
                    "Are you sure you want to delete this Taluka report?"
                );


            if (!confirmed) {

                return;

            }


            try {

                setDeletingId(id);

                setErrorMessage("");

                setSuccessMessage("");


                const {
                    response,
                    data,
                    url,
                } =
                    await requestTalukaReport(

                        `/${id}`,

                        {
                            method: "DELETE",
                        }

                    );


                console.log(
                    "DELETE TALUKA REPORT:",
                    url
                );


                if (
                    !response.ok ||
                    data.success === false
                ) {

                    throw new Error(
                        data.message ||
                        "Delete failed."
                    );

                }


                await loadReports();


                window.dispatchEvent(
                    new Event(
                        "reportsChanged"
                    )
                );


                setSuccessMessage(
                    "Taluka report deleted successfully."
                );


            } catch (error) {

                console.error(
                    "DELETE TALUKA REPORT:",
                    error
                );


                setErrorMessage(
                    error.message ||
                    "Failed to delete report."
                );

            } finally {

                setDeletingId(null);

            }

        };


    // =================================================
    // EXCEL ESCAPE
    // =================================================

    const escapeExcel = (
        value
    ) => {

        const stringValue =
            value === null ||
            value === undefined
                ? ""
                : String(value);


        return stringValue

            .replace(
                /&/g,
                "&amp;"
            )

            .replace(
                /</g,
                "&lt;"
            )

            .replace(
                />/g,
                "&gt;"
            )

            .replace(
                /"/g,
                "&quot;"
            );

    };


    // =================================================
    // EXCEL DOWNLOAD
    // =================================================

    const downloadExcel = () => {

        if (
            !filteredReports.length
        ) {

            setErrorMessage(
                "Download करण्यासाठी कोणताही report उपलब्ध नाही."
            );

            return;

        }


        // =================================================
        // ALL TABLE FIELDS
        // =================================================

        const headers = [

            "SR",

            "Name",

            "Designation",

            "Taluka",

            "District",

            "Mobile Number",

            "Report Date",

            "Total authourised center Head-50 (अधिकृत केंद्र प्रमुखांची एकूण संख्या -५०)",

            "Total Active Center Head",

            "Today's Visited Center Heads Name",

            "Total Sanitary Pads Box Sold Today",

            "Total Amount From Sanitary Pad Box Sales Today",

            "UTR Number",

            "Additional Remarks",

            "Meeting Photo 1",

            "Meeting Photo 2",

            "Status",

        ];


        const rows =
            filteredReports.map(
                (
                    report,
                    index
                ) => [

                    index + 1,

                    report?.name ||
                    "",

                    report?.designation ||
                    "",

                    report?.taluka ||
                    "",

                    report?.district ||
                    "",

                    report?.mobile_number ||

                    report?.mobileNumber ||

                    "",

                    formatDate(

                        report?.report_date ||

                        report?.reportDate

                    ),


                    // AUTHORISED

                    report?.total_authorised_center_heads ??

                    report?.total_authorised_center_heads_50 ??

                    report?.total_center_heads ??

                    report?.totalCenterHeads ??

                    0,


                    // ACTIVE

                    report?.total_active_center_heads ??

                    report?.totalActiveCenterHeads ??

                    0,


                    // VISITED

                    report?.visited_center_heads_names ||

                    report?.names_of_center_heads_visited_today ||

                    report?.namesOfCenterHeadsVisitedToday ||

                    "",


                    // BOXES

                    report?.sanitary_pads_boxes_sold ??

                    report?.total_sanitary_pads_box_sold_today ??

                    report?.totalSanitaryPadsBoxSoldToday ??

                    0,


                    // AMOUNT

                    report?.sanitary_pads_sales_amount ??

                    report?.total_amount_from_sanitary_pad_box_sales_today ??

                    report?.totalAmountFromSanitaryPadBoxSalesToday ??

                    0,


                    // UTR

                    report?.utr_number ||

                    report?.utrNumber ||

                    "",


                    // REMARKS

                    report?.additional_remarks ||

                    report?.additionalRemarks ||

                    "",


                    // PHOTO 1

                    getImageUrl(
                        getPhoto1(
                            report
                        )
                    ),


                    // PHOTO 2

                    getImageUrl(
                        getPhoto2(
                            report
                        )
                    ),


                    // STATUS

                    report?.status ||
                    "active",

                ]
            );


        // =================================================
        // HEADER HTML
        // =================================================

        const headerHtml =
            headers

                .map(
                    (header) =>
                        `<th>${escapeExcel(
                            header
                        )}</th>`
                )

                .join("");


        // =================================================
        // BODY HTML
        // =================================================

        const bodyHtml =
            rows

                .map(
                    (row) =>

                        `<tr>${row

                            .map(
                                (cell) =>
                                    `<td>${escapeExcel(
                                        cell
                                    )}</td>`
                            )

                            .join("")}

                        </tr>`

                )

                .join("");


        // =================================================
        // WORKBOOK
        // =================================================

        const workbookHtml = `

            <html>

                <head>

                    <meta
                        http-equiv="Content-Type"
                        content="text/html; charset=UTF-8"
                    />

                    <style>

                        table {

                            border-collapse:
                                collapse;

                            width:
                                100%;

                        }


                        th {

                            background:
                                #212529;

                            color:
                                #ffffff;

                            font-weight:
                                bold;

                            border:
                                1px solid
                                #000000;

                            padding:
                                8px;

                        }


                        td {

                            border:
                                1px solid
                                #cccccc;

                            padding:
                                8px;

                            vertical-align:
                                top;

                        }

                    </style>

                </head>


                <body>

                    <table>

                        <thead>

                            <tr>

                                ${headerHtml}

                            </tr>

                        </thead>


                        <tbody>

                            ${bodyHtml}

                        </tbody>

                    </table>

                </body>

            </html>

        `;


        const blob =
            new Blob(

                [

                    "\ufeff",

                    workbookHtml,

                ],

                {

                    type:
                        "application/vnd.ms-excel;charset=utf-8;",

                }

            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        const datePart =
            new Date()
                .toISOString()
                .substring(
                    0,
                    10
                );


        link.href = url;


        link.download =
            `Taluka_Reports_${datePart}.xls`;


        document.body.appendChild(
            link
        );


        link.click();


        document.body.removeChild(
            link
        );


        URL.revokeObjectURL(
            url
        );


        setSuccessMessage(
            `${filteredReports.length} report(s) Excel मध्ये download झाले.`
        );

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

        <>

            <style>{`

                /* ============================================
                   TABLE
                ============================================ */

                .taluka-dashboard .table-responsive {

                    width:
                        100%;

                    max-height:
                        calc(100vh - 350px);

                    overflow-x:
                        auto !important;

                    overflow-y:
                        auto !important;

                    -webkit-overflow-scrolling:
                        touch;

                }


                .taluka-dashboard .table {

                    min-width:
                        3000px;

                }


                .taluka-dashboard .table th,
                .taluka-dashboard .table td {

                    white-space:
                        nowrap;

                    font-size:
                        12px;

                    padding:
                        9px 10px;

                    vertical-align:
                        middle;

                }


                .taluka-dashboard .table th {

                    font-weight:
                        700;

                }


                .taluka-dashboard .table thead th {

                    position:
                        sticky;

                    top:
                        0;

                    z-index:
                        10;

                    background:
                        #f8f9fa !important;

                    box-shadow:
                        inset 0 -1px 0 #dee2e6;

                }


                /* ============================================
                   REMARKS / VISITED
                ============================================ */

                .taluka-dashboard .remarks-cell {

                    min-width:
                        300px;

                    max-width:
                        450px;

                    white-space:
                        normal !important;

                    word-break:
                        break-word;

                }


                .taluka-dashboard .visited-cell {

                    min-width:
                        300px;

                    max-width:
                        450px;

                    white-space:
                        normal !important;

                    word-break:
                        break-word;

                }


                /* ============================================
                   MOBILE
                ============================================ */

                @media (max-width: 767.98px) {

                    .taluka-dashboard .container-fluid {

                        padding-left:
                            12px !important;

                        padding-right:
                            12px !important;

                    }


                    .taluka-dashboard h2 {

                        font-size:
                            1.5rem;

                    }


                    .taluka-dashboard .taluka-report-modal {

                        width:
                            calc(100% - 16px) !important;

                        margin:
                            8px auto !important;

                    }


                    .taluka-dashboard .taluka-modal-body {

                        max-height:
                            72vh !important;

                    }


                    .taluka-dashboard .modal-footer {

                        display:
                            grid;

                        grid-template-columns:
                            1fr 1fr;

                        gap:
                            8px;

                    }


                    .taluka-dashboard .modal-footer > button {

                        width:
                            100%;

                        margin:
                            0 !important;

                    }

                }


                /* ============================================
                   MODAL
                ============================================ */

                .taluka-report-modal {

                    max-width:
                        1200px !important;

                    width:
                        calc(100% - 30px) !important;

                    margin:
                        15px auto !important;

                    height:
                        calc(100vh - 30px) !important;

                }


                .taluka-report-modal-content {

                    height:
                        100% !important;

                    max-height:
                        100% !important;

                    border-radius:
                        12px !important;

                    overflow:
                        hidden !important;

                }


                .taluka-modal-body {

                    flex:
                        1 1 auto !important;

                    min-height:
                        0 !important;

                    overflow-y:
                        auto !important;

                    overflow-x:
                        hidden !important;

                    padding:
                        24px !important;

                }


                .taluka-modal-body::-webkit-scrollbar {

                    width:
                        10px;

                }


                .taluka-modal-body::-webkit-scrollbar-track {

                    background:
                        #f1f1f1;

                    border-radius:
                        10px;

                }


                .taluka-modal-body::-webkit-scrollbar-thumb {

                    background:
                        #888;

                    border-radius:
                        10px;

                }


                .taluka-modal-body::-webkit-scrollbar-thumb:hover {

                    background:
                        #555;

                }


                /* ============================================
                   MOBILE MODAL
                ============================================ */

                @media (max-width: 768px) {

                    .taluka-report-modal {

                        width:
                            100% !important;

                        height:
                            100vh !important;

                        margin:
                            0 !important;

                    }


                    .taluka-report-modal-content {

                        border-radius:
                            0 !important;

                    }


                    .taluka-modal-body {

                        padding:
                            16px !important;

                    }


                    .navbar {

                        padding-left:
                            12px !important;

                        padding-right:
                            12px !important;

                    }

                }

            `}</style>


            <div
                className="
                    min-vh-100
                    bg-light
                    taluka-dashboard
                "
            >


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
                                Taluka Dashboard
                            </h4>


                            <small
                                className="
                                    text-muted
                                "
                            >
                                Taluka Management System
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
                                T
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
                                        talukaName ||
                                        "Taluka"
                                    }
                                </div>


                                <small
                                    className="
                                        text-muted
                                    "
                                >
                                    Taluka Head
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

                <div
                    className="
                        container-fluid
                        p-3
                        p-md-4
                    "
                >


                    {/* ALERT */}

                    {errorMessage && (

                        <Alert
                            variant="danger"
                            dismissible
                            onClose={() =>
                                setErrorMessage("")
                            }
                        >
                            {errorMessage}
                        </Alert>

                    )}


                    {successMessage && (

                        <Alert
                            variant="success"
                            dismissible
                            onClose={() =>
                                setSuccessMessage("")
                            }
                        >
                            {successMessage}
                        </Alert>

                    )}


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

                            <h2
                                className="
                                    fw-bold
                                    mb-1
                                "
                            >
                                Taluka Reports
                            </h2>


                            <p
                                className="
                                    text-muted
                                    mb-0
                                "
                            >
                                Manage Taluka reports
                            </p>

                        </div>


                        <div
                            className="
                                d-flex
                                gap-2
                                flex-wrap
                                align-items-center
                            "
                        >

                            {talukaName && (

                                <span
                                    className="
                                        badge
                                        bg-dark
                                        px-3
                                        py-2
                                    "
                                >
                                    Taluka:
                                    {" "}
                                    {talukaName}
                                </span>

                            )}


                            <Button
                                variant="outline-dark"
                                onClick={
                                    loadReports
                                }
                                disabled={
                                    loading
                                }
                            >

                                {loading ? (

                                    <>
                                        <Spinner
                                            animation="border"
                                            size="sm"
                                            className="me-2"
                                        />

                                        Loading

                                    </>

                                ) : (

                                    "↻ Refresh"

                                )}

                            </Button>


                            <Button
                                variant="dark"
                                onClick={
                                    handleOpenAddReport
                                }
                            >
                                + Add Report (अहवाल जोडा)
                            </Button>

                        </div>

                    </div>


                    {/* =================================================
                        COUNT
                    ================================================= */}

                    <div
                        className="
                            card
                            border-0
                            shadow-sm
                            mb-4
                        "
                    >

                        <div
                            className="
                                card-body
                                p-4
                            "
                        >

                            <div
                                className="
                                    d-flex
                                    align-items-center
                                    gap-3
                                "
                            >

                                <div
                                    className="
                                        bg-dark
                                        text-white
                                        rounded
                                        d-flex
                                        align-items-center
                                        justify-content-center
                                        fw-bold
                                    "
                                    style={{
                                        width:
                                            "72px",

                                        height:
                                            "72px",

                                        fontSize:
                                            "24px",
                                    }}
                                >
                                    {
                                        talukaReports.length
                                    }
                                </div>


                                <div>

                                    <div
                                        className="
                                            text-muted
                                        "
                                    >
                                        Total Taluka Reports
                                    </div>


                                    <h3
                                        className="
                                            fw-bold
                                            mb-0
                                        "
                                    >
                                        {
                                            talukaReports.length
                                        }
                                    </h3>

                                </div>

                            </div>

                        </div>

                    </div>


                    {/* =================================================
                        FILTERS
                    ================================================= */}

                    <div
                        className="
                            card
                            border-0
                            shadow-sm
                            mb-4
                        "
                    >

                        <div
                            className="
                                card-body
                                p-3
                                p-md-4
                            "
                        >

                            <div
                                className="
                                    row
                                    g-3
                                "
                            >


                                {/* NAME */}

                                <div
                                    className="
                                        col-12
                                        col-md-6
                                        col-xl-3
                                    "
                                >

                                    <label
                                        className="
                                            form-label
                                            fw-semibold
                                        "
                                    >
                                        Name
                                    </label>


                                    <Form.Control
                                        type="text"
                                        name="name"
                                        value={
                                            filters.name
                                        }
                                        onChange={
                                            handleFilterChange
                                        }
                                        placeholder="Search Name..."
                                    />

                                </div>


                                {/* TALUKA */}

                                <div
                                    className="
                                        col-12
                                        col-md-6
                                        col-xl-3
                                    "
                                >

                                    <label
                                        className="
                                            form-label
                                            fw-semibold
                                        "
                                    >
                                        Taluka
                                    </label>


                                    <Form.Control
                                        type="text"
                                        name="taluka"
                                        value={
                                            filters.taluka
                                        }
                                        onChange={
                                            handleFilterChange
                                        }
                                        placeholder="Search Taluka..."
                                    />

                                </div>


                                {/* DISTRICT */}

                                <div
                                    className="
                                        col-12
                                        col-md-6
                                        col-xl-3
                                    "
                                >

                                    <label
                                        className="
                                            form-label
                                            fw-semibold
                                        "
                                    >
                                        District
                                    </label>


                                    <Form.Control
                                        type="text"
                                        name="district"
                                        value={
                                            filters.district
                                        }
                                        onChange={
                                            handleFilterChange
                                        }
                                        placeholder="Search District..."
                                    />

                                </div>


                                {/* DATE */}

                                <div
                                    className="
                                        col-12
                                        col-md-6
                                        col-xl-3
                                    "
                                >

                                    <label
                                        className="
                                            form-label
                                            fw-semibold
                                        "
                                    >
                                        Report Date
                                    </label>


                                    <Form.Control
                                        type="date"
                                        name="report_date"
                                        value={
                                            filters.report_date
                                        }
                                        onChange={
                                            handleFilterChange
                                        }
                                    />

                                </div>


                                {/* SEARCH */}

                                <div
                                    className="
                                        col-12
                                    "
                                >

                                    <label
                                        className="
                                            form-label
                                            fw-semibold
                                        "
                                    >
                                        Search
                                    </label>


                                    <div
                                        className="
                                            row
                                            g-2
                                        "
                                    >

                                        <div
                                            className="
                                                col-12
                                                col-lg
                                            "
                                        >

                                            <Form.Control
                                                type="text"
                                                value={
                                                    search
                                                }
                                                onChange={(e) =>
                                                    setSearch(
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Search Name, Taluka, District, Mobile, UTR..."
                                            />

                                        </div>


                                        <div
                                            className="
                                                col-12
                                                col-sm-auto
                                            "
                                        >

                                            <Button
                                                type="button"
                                                variant="outline-secondary"
                                                className="w-100"
                                                onClick={
                                                    clearFilters
                                                }
                                            >
                                                Clear
                                            </Button>

                                        </div>


                                        <div
                                            className="
                                                col-12
                                                col-sm-auto
                                            "
                                        >

                                            <Button
                                                type="button"
                                                variant="success"
                                                className="w-100"
                                                onClick={
                                                    downloadExcel
                                                }
                                                disabled={
                                                    !filteredReports.length
                                                }
                                            >
                                                Download Excel
                                            </Button>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>


                    {/* =================================================
                        TABLE
                    ================================================= */}

                    <div
                        className="
                            card
                            border-0
                            shadow-sm
                        "
                    >

                        <div
                            className="
                                card-header
                                bg-white
                                py-3
                            "
                        >

                            <div
                                className="
                                    d-flex
                                    justify-content-between
                                    align-items-center
                                    gap-2
                                "
                            >

                                <div>

                                    <h6
                                        className="
                                            fw-bold
                                            mb-1
                                        "
                                    >
                                        Taluka Report List
                                    </h6>


                                    <small
                                        className="
                                            text-muted
                                        "
                                    >
                                        All Taluka report details are displayed below
                                    </small>

                                </div>


                                <span
                                    className="
                                        badge
                                        bg-dark
                                    "
                                >
                                    {
                                        filteredReports.length
                                    } Records
                                </span>

                            </div>

                        </div>


                        {/* =================================================
                            TABLE SCROLL
                        ================================================= */}

                        <div
                            className="
                                table-responsive
                            "
                            style={{
                                maxHeight:
                                    "calc(100vh - 350px)",

                                overflowX:
                                    "auto",

                                overflowY:
                                    "auto",
                            }}
                        >

                            <table
                                className="
                                    table
                                    table-bordered
                                    table-hover
                                    align-middle
                                    mb-0
                                "
                                style={{
                                    minWidth:
                                        "3000px",
                                }}
                            >


                                {/* =================================================
                                    HEADER
                                ================================================= */}

                                <thead
                                    className="
                                        table-light
                                    "
                                    style={{
                                        position:
                                            "sticky",

                                        top:
                                            0,

                                        zIndex:
                                            10,
                                    }}
                                >

                                    <tr>


                                        <th
                                            className="
                                                text-center
                                            "
                                        >
                                            SR
                                        </th>


                                        <th>
                                            Name
                                        </th>


                                        <th>
                                            Designation
                                        </th>


                                        {/* TALUKA */}

                                        <th>
                                            Taluka
                                        </th>


                                        <th>
                                            District
                                        </th>


                                        <th>
                                            Mobile Number
                                        </th>


                                        <th>
                                            Report Date
                                        </th>


                                        {/* AUTHORISED */}

                                        <th
                                            className="
                                                text-center
                                            "
                                        >
                                            Total authourised center Head-50 (अधिकृत केंद्र प्रमुखांची एकूण संख्या -५०)
                                        </th>


                                        {/* ACTIVE */}

                                        <th
                                            className="
                                                text-center
                                            "
                                        >
                                            Total Active
                                            Center Head
                                        </th>


                                        {/* VISITED */}

                                        <th>
                                            Today's Visited
                                            Center Heads Name
                                        </th>


                                        {/* BOX SOLD */}

                                        <th
                                            className="
                                                text-center
                                            "
                                        >
                                            Total Sanitary Pads
                                            Box Sold Today
                                        </th>


                                        {/* SALES */}

                                        <th
                                            className="
                                                text-end
                                            "
                                        >
                                            Total Amount From
                                            Sanitary Pad Box
                                            Sales Today
                                        </th>


                                        {/* UTR */}

                                        <th>
                                            UTR Number
                                        </th>


                                        {/* REMARKS */}

                                        <th>
                                            Additional Remarks
                                        </th>


                                        {/* PHOTO 1 */}

                                        <th
                                            className="
                                                text-center
                                            "
                                        >
                                            Meeting Photo 1
                                        </th>


                                        {/* PHOTO 2 */}

                                        <th
                                            className="
                                                text-center
                                            "
                                        >
                                            Meeting Photo 2
                                        </th>


                                        {/* STATUS */}

                                        <th
                                            className="
                                                text-center
                                            "
                                        >
                                            Status
                                        </th>


                                        {/* ACTION */}

                                        <th
                                            className="
                                                text-center
                                            "
                                        >
                                            Action
                                        </th>


                                    </tr>

                                </thead>


                                {/* =================================================
                                    BODY
                                ================================================= */}

                                <tbody>


                                    {/* LOADING */}

                                    {loading && (

                                        <tr>

                                            <td
                                                colSpan="18"
                                                className="
                                                    text-center
                                                    py-5
                                                "
                                            >

                                                <Spinner
                                                    animation="border"
                                                    size="sm"
                                                    className="me-2"
                                                />

                                                Loading Taluka
                                                reports...

                                            </td>

                                        </tr>

                                    )}


                                    {/* EMPTY */}

                                    {!loading &&
                                        filteredReports.length ===
                                            0 && (

                                            <tr>

                                                <td
                                                    colSpan="18"
                                                    className="
                                                        text-center
                                                        text-muted
                                                        py-5
                                                    "
                                                >

                                                    No Taluka
                                                    reports found.

                                                </td>

                                            </tr>

                                        )}


                                    {/* DATA */}

                                    {!loading &&
                                        filteredReports.map(
                                            (
                                                report,
                                                index
                                            ) => {

                                                const photo1 =
                                                    getImageUrl(
                                                        getPhoto1(
                                                            report
                                                        )
                                                    );


                                                const photo2 =
                                                    getImageUrl(
                                                        getPhoto2(
                                                            report
                                                        )
                                                    );


                                                return (

                                                    <tr
                                                        key={
                                                            report.id ||
                                                            index
                                                        }
                                                    >


                                                        {/* SR */}

                                                        <td
                                                            className="
                                                                text-center
                                                            "
                                                        >
                                                            {
                                                                index +
                                                                1
                                                            }
                                                        </td>


                                                        {/* NAME */}

                                                        <td
                                                            className="
                                                                fw-semibold
                                                            "
                                                        >
                                                            {
                                                                report.name ||
                                                                "-"
                                                            }
                                                        </td>


                                                        {/* DESIGNATION */}

                                                        <td>
                                                            {
                                                                report.designation ||
                                                                "-"
                                                            }
                                                        </td>


                                                        {/* TALUKA */}

                                                        <td>
                                                            {
                                                                report.taluka ||
                                                                "-"
                                                            }
                                                        </td>


                                                        {/* DISTRICT */}

                                                        <td>
                                                            {
                                                                report.district ||
                                                                "-"
                                                            }
                                                        </td>


                                                        {/* MOBILE */}

                                                        <td>
                                                            {
                                                                report.mobile_number ||

                                                                report.mobileNumber ||

                                                                "-"
                                                            }
                                                        </td>


                                                        {/* DATE */}

                                                        <td>
                                                            {
                                                                formatDate(
                                                                    report.report_date ||

                                                                    report.reportDate
                                                                ) ||

                                                                "-"
                                                            }
                                                        </td>


                                                        {/* =================================================
                                                            TOTAL AUTHORISED CENTER HEAD
                                                        ================================================= */}

                                                        <td
                                                            className="
                                                                text-center
                                                                fw-semibold
                                                            "
                                                        >
                                                            {
                                                                report.total_authorised_center_heads ??

                                                                report.total_authorised_center_heads_50 ??

                                                                report.total_center_heads ??

                                                                report.totalCenterHeads ??

                                                                0
                                                            }
                                                        </td>


                                                        {/* =================================================
                                                            TOTAL ACTIVE CENTER HEAD
                                                        ================================================= */}

                                                        <td
                                                            className="
                                                                text-center
                                                                fw-semibold
                                                            "
                                                        >
                                                            {
                                                                report.total_active_center_heads ??

                                                                report.totalActiveCenterHeads ??

                                                                0
                                                            }
                                                        </td>


                                                        {/* =================================================
                                                            TODAY VISITED
                                                        ================================================= */}

                                                        <td
                                                            className="
                                                                visited-cell
                                                            "
                                                        >
                                                            {
                                                                report.visited_center_heads_names ||

                                                                report.names_of_center_heads_visited_today ||

                                                                report.namesOfCenterHeadsVisitedToday ||

                                                                "-"
                                                            }
                                                        </td>


                                                        {/* =================================================
                                                            SANITARY PADS
                                                        ================================================= */}

                                                        <td
                                                            className="
                                                                text-center
                                                            "
                                                        >
                                                            {
                                                                report.sanitary_pads_boxes_sold ??

                                                                report.total_sanitary_pads_box_sold_today ??

                                                                report.totalSanitaryPadsBoxSoldToday ??

                                                                0
                                                            }
                                                        </td>


                                                        {/* =================================================
                                                            SALES AMOUNT
                                                        ================================================= */}

                                                        <td
                                                            className="
                                                                text-end
                                                                fw-semibold
                                                            "
                                                        >

                                                            ₹{" "}

                                                            {
                                                                report.sanitary_pads_sales_amount ??

                                                                report.total_amount_from_sanitary_pad_box_sales_today ??

                                                                report.totalAmountFromSanitaryPadBoxSalesToday ??

                                                                "0.00"
                                                            }

                                                        </td>


                                                        {/* UTR */}

                                                        <td>
                                                            {
                                                                report.utr_number ||

                                                                report.utrNumber ||

                                                                "-"
                                                            }
                                                        </td>


                                                        {/* =================================================
                                                            REMARKS
                                                        ================================================= */}

                                                        <td
                                                            className="
                                                                remarks-cell
                                                            "
                                                        >
                                                            {
                                                                report.additional_remarks ||

                                                                report.additionalRemarks ||

                                                                "-"
                                                            }
                                                        </td>


                                                        {/* =================================================
                                                            PHOTO 1
                                                        ================================================= */}

                                                        <td
                                                            className="
                                                                text-center
                                                            "
                                                        >

                                                            {photo1 ? (

                                                                <div
                                                                    className="
                                                                        d-flex
                                                                        flex-column
                                                                        align-items-center
                                                                        gap-2
                                                                    "
                                                                >

                                                                    <img
                                                                        src={
                                                                            photo1
                                                                        }
                                                                        alt="Meeting Photo 1"
                                                                        style={{
                                                                            width:
                                                                                "90px",

                                                                            height:
                                                                                "70px",

                                                                            objectFit:
                                                                                "cover",

                                                                            borderRadius:
                                                                                "6px",

                                                                            border:
                                                                                "1px solid #dee2e6",

                                                                            cursor:
                                                                                "pointer",
                                                                        }}
                                                                        onClick={() =>
                                                                            handleViewImage(
                                                                                photo1
                                                                            )
                                                                        }
                                                                        onError={(
                                                                            e
                                                                        ) => {

                                                                            e.currentTarget.style.display =
                                                                                "none";

                                                                        }}
                                                                    />


                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline-dark"
                                                                        onClick={() =>
                                                                            handleViewImage(
                                                                                photo1
                                                                            )
                                                                        }
                                                                    >
                                                                        View
                                                                    </Button>

                                                                </div>

                                                            ) : (

                                                                <span
                                                                    className="
                                                                        text-muted
                                                                    "
                                                                >
                                                                    -
                                                                </span>

                                                            )}

                                                        </td>


                                                        {/* =================================================
                                                            PHOTO 2
                                                        ================================================= */}

                                                        <td
                                                            className="
                                                                text-center
                                                            "
                                                        >

                                                            {photo2 ? (

                                                                <div
                                                                    className="
                                                                        d-flex
                                                                        flex-column
                                                                        align-items-center
                                                                        gap-2
                                                                    "
                                                                >

                                                                    <img
                                                                        src={
                                                                            photo2
                                                                        }
                                                                        alt="Meeting Photo 2"
                                                                        style={{
                                                                            width:
                                                                                "90px",

                                                                            height:
                                                                                "70px",

                                                                            objectFit:
                                                                                "cover",

                                                                            borderRadius:
                                                                                "6px",

                                                                            border:
                                                                                "1px solid #dee2e6",

                                                                            cursor:
                                                                                "pointer",
                                                                        }}
                                                                        onClick={() =>
                                                                            handleViewImage(
                                                                                photo2
                                                                            )
                                                                        }
                                                                        onError={(
                                                                            e
                                                                        ) => {

                                                                            e.currentTarget.style.display =
                                                                                "none";

                                                                        }}
                                                                    />


                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline-dark"
                                                                        onClick={() =>
                                                                            handleViewImage(
                                                                                photo2
                                                                            )
                                                                        }
                                                                    >
                                                                        View
                                                                    </Button>

                                                                </div>

                                                            ) : (

                                                                <span
                                                                    className="
                                                                        text-muted
                                                                    "
                                                                >
                                                                    -
                                                                </span>

                                                            )}

                                                        </td>


                                                        {/* STATUS */}

                                                        <td
                                                            className="
                                                                text-center
                                                            "
                                                        >

                                                            <span
                                                                className="
                                                                    badge
                                                                    bg-success
                                                                "
                                                            >
                                                                {
                                                                    report.status ||
                                                                    "active"
                                                                }
                                                            </span>

                                                        </td>


                                                        {/* ACTION */}

                                                        <td
                                                            className="
                                                                text-center
                                                            "
                                                        >

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
                                                                        handleEditReport(
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

                                                                    {
                                                                        deletingId ===
                                                                        report.id

                                                                            ? "Deleting..."

                                                                            : "Delete"
                                                                    }

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


                {/* =====================================================
                    ADD / EDIT MODAL
                ===================================================== */}

                <Modal
                    show={
                        showModal
                    }
                    onHide={
                        handleClose
                    }
                    size="xl"
                    centered={false}
                    backdrop="static"
                    keyboard={
                        !submitting
                    }
                    dialogClassName="
                        taluka-report-modal
                    "
                    contentClassName="
                        taluka-report-modal-content
                    "
                >

                    <Form
                        onSubmit={
                            handleSubmit
                        }
                        className="
                            d-flex
                            flex-column
                            h-100
                        "
                    >


                        {/* HEADER */}

                        <Modal.Header
                            closeButton
                            className="
                                flex-shrink-0
                            "
                        >

                            <Modal.Title className="fw-bold">
                                {editingId
                                    ? "Edit Taluka Report (तालुका अहवाल संपादित करा)"
                                    : "Add Taluka Report (तालुका अहवाल जोडा)"}
                            </Modal.Title>

                        </Modal.Header>


                        {/* BODY */}

                        <Modal.Body className="taluka-modal-body">


                            {/* =================================================
                                BASIC INFORMATION
                            ================================================= */}

                            <h5 className="fw-bold border-bottom pb-2 mb-4">
                                Basic Information (मूलभूत माहिती)
                            </h5>


                            <div className="row g-3">


                                {/* NAME */}

                                <div className="col-12 col-md-6">

                                    <Form.Group>

                                        <Form.Label className="fw-semibold">
                                            Name (नाव) *
                                        </Form.Label>

                                        <Form.Control
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="नाव प्रविष्ट करा"
                                            required
                                        />

                                    </Form.Group>

                                </div>


                                {/* DESIGNATION */}

                                <div className="col-12 col-md-6">

                                    <Form.Group>

                                        <Form.Label className="fw-semibold">
                                            Designation (पद) *
                                        </Form.Label>

                                        <Form.Control
                                            name="designation"
                                            value={formData.designation}
                                            onChange={handleChange}
                                            placeholder="पद प्रविष्ट करा"
                                            required
                                        />

                                    </Form.Group>

                                </div>


                                {/* TALUKA */}

                                <div className="col-12 col-md-6">

                                    <Form.Group>

                                        <Form.Label className="fw-semibold">
                                            Taluka (तालुका) *
                                        </Form.Label>

                                        <Form.Control
                                            name="taluka"
                                            value={formData.taluka}
                                            onChange={handleChange}
                                            placeholder="तालुका प्रविष्ट करा"
                                            required
                                        />

                                    </Form.Group>

                                </div>


                                {/* DISTRICT */}

                                <div className="col-12 col-md-6">

                                    <Form.Group>

                                        <Form.Label className="fw-semibold">
                                            District (जिल्हा) *
                                        </Form.Label>

                                        <Form.Control
                                            name="district"
                                            value={formData.district}
                                            onChange={handleChange}
                                            placeholder="जिल्हा प्रविष्ट करा"
                                            required
                                        />

                                    </Form.Group>

                                </div>


                                {/* MOBILE */}

                                <div className="col-12 col-md-6">

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
                                            inputMode="numeric"
                                            placeholder="१० अंकी मोबाईल क्रमांक"
                                            required
                                        />

                                    </Form.Group>

                                </div>


                                {/* REPORT DATE */}

                                <div className="col-12 col-md-6">

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

                                </div>

                            </div>


                            <hr className="my-4" />


                            {/* =================================================
                                REPORT DETAILS
                            ================================================= */}

                            <h5 className="fw-bold border-bottom pb-2 mb-4">
                                Report Details (अहवाल तपशील)
                            </h5>


                            <div className="row g-3">


                                {/* AUTHORISED CENTER HEAD */}

                                <div className="col-12 col-md-6">

                                    <Form.Group>

                                        <Form.Label className="fw-semibold">
                                            Total authourised center Head-50 (अधिकृत केंद्र प्रमुखांची एकूण संख्या -५०) - 50 (अधिकृत केंद्र प्रमुखांची एकूण संख्या - ५०) *
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

                                </div>


                                {/* ACTIVE CENTER HEAD */}

                                <div className="col-12 col-md-6">

                                    <Form.Group>

                                        <Form.Label className="fw-semibold">
                                            Total Active Center Head (सक्रिय केंद्र प्रमुखांची एकूण संख्या) *
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

                                </div>


                                {/* TODAY VISITED CENTER HEADS */}

                                <div className="col-12">

                                    <Form.Group>

                                        <Form.Label className="fw-semibold">
                                            Today's Visited Center Heads Name (आज भेट दिलेल्या केंद्र प्रमुखांची नावे) *
                                        </Form.Label>

                                        <Form.Control
                                            as="textarea"
                                            rows="4"
                                            name="namesOfCenterHeadsVisitedToday"
                                            value={formData.namesOfCenterHeadsVisitedToday}
                                            onChange={handleChange}
                                            placeholder="आज भेट दिलेल्या केंद्र प्रमुखांची नावे प्रविष्ट करा..."
                                            required
                                        />

                                    </Form.Group>

                                </div>


                                {/* SANITARY PADS BOX SOLD */}

                                <div className="col-12 col-md-6">

                                    <Form.Group>

                                        <Form.Label className="fw-semibold">
                                            Total Sanitary Pads Box Sold Today (आज विकलेले एकूण सॅनिटरी पॅड बॉक्स) *
                                        </Form.Label>

                                        <Form.Control
                                            type="number"
                                            min="0"
                                            name="totalSanitaryPadsBoxSoldToday"
                                            value={formData.totalSanitaryPadsBoxSoldToday}
                                            onChange={handleChange}
                                            placeholder="पॅड बॉक्स संख्या"
                                            required
                                        />

                                    </Form.Group>

                                </div>


                                {/* SALES AMOUNT */}

                                <div className="col-12 col-md-6">

                                    <Form.Group>

                                        <Form.Label className="fw-semibold">
                                            Total Amount From Sanitary Pad Box Sales Today (आजच्या सॅनिटरी पॅड बॉक्स विक्रीतून एकूण रक्कम) *
                                        </Form.Label>

                                        <Form.Control
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            name="totalAmountFromSanitaryPadBoxSalesToday"
                                            value={formData.totalAmountFromSanitaryPadBoxSalesToday}
                                            onChange={handleChange}
                                            placeholder="एकूण रक्कम"
                                            required
                                        />

                                    </Form.Group>

                                </div>


                                {/* UTR */}

                                <div className="col-12 col-md-6">

                                    <Form.Group>

                                        <Form.Label className="fw-semibold">
                                            UTR Number (युटीआर क्रमांक) *
                                        </Form.Label>

                                        <Form.Control
                                            name="utrNumber"
                                            value={formData.utrNumber}
                                            onChange={handleChange}
                                            placeholder="UTR क्रमांक प्रविष्ट करा"
                                            required
                                        />

                                    </Form.Group>

                                </div>


                                {/* ADDITIONAL REMARKS */}

                                <div className="col-12">

                                    <Form.Group>

                                        <Form.Label className="fw-semibold">
                                            Additional Remarks (इतर माहिती / शेरा) *
                                        </Form.Label>

                                        <Form.Control
                                            as="textarea"
                                            rows="4"
                                            name="additionalRemarks"
                                            value={formData.additionalRemarks}
                                            onChange={handleChange}
                                            placeholder="इतर माहिती / शेरा प्रविष्ट करा..."
                                            required
                                        />

                                    </Form.Group>

                                </div>

                            </div>


                        </Modal.Body>


                        {/* =================================================
                            FOOTER
                        ================================================= */}

                        <Modal.Footer className="flex-shrink-0">

                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleClose}
                                disabled={submitting}
                            >
                                Cancel (रद्द करा)
                            </Button>

                            <Button
                                type="submit"
                                variant="dark"
                                disabled={submitting}
                            >

                                {submitting ? (
                                    <>
                                        <Spinner
                                            animation="border"
                                            size="sm"
                                            className="me-2"
                                        />
                                        Saving...
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


                {/* =====================================================
                    IMAGE VIEW MODAL
                ===================================================== */}

                <Modal
                    show={
                        showImageModal
                    }
                    onHide={() =>
                        setShowImageModal(
                            false
                        )
                    }
                    centered
                    size="lg"
                >

                    <Modal.Header
                        closeButton
                    >

                        <Modal.Title>
                            Meeting Photo
                        </Modal.Title>

                    </Modal.Header>


                    <Modal.Body
                        className="
                            text-center
                        "
                    >

                        {selectedImage && (

                            <img
                                src={
                                    selectedImage
                                }
                                alt="Meeting"
                                style={{
                                    maxWidth:
                                        "100%",

                                    maxHeight:
                                        "70vh",

                                    objectFit:
                                        "contain",
                                }}
                            />

                        )}

                    </Modal.Body>


                    <Modal.Footer>

                        <Button
                            variant="secondary"
                            onClick={() =>
                                setShowImageModal(
                                    false
                                )
                            }
                        >
                            Close
                        </Button>

                    </Modal.Footer>

                </Modal>


                {/* =====================================================
                    FINAL CSS
                ===================================================== */}

                <style>{`

                    .taluka-dashboard-table {

                        width:
                            100%;

                    }


                    .taluka-dashboard-table th,
                    .taluka-dashboard-table td {

                        white-space:
                            nowrap;

                        font-size:
                            12px;

                        padding:
                            9px 10px;

                        vertical-align:
                            middle;

                    }


                    .taluka-dashboard-table th {

                        font-weight:
                            700;

                    }


                    .table-responsive {

                        -webkit-overflow-scrolling:
                            touch;

                    }


                    .table-responsive::-webkit-scrollbar {

                        width:
                            8px;

                        height:
                            9px;

                    }


                    .table-responsive::-webkit-scrollbar-track {

                        background:
                            #f1f3f5;

                    }


                    .table-responsive::-webkit-scrollbar-thumb {

                        background:
                            #adb5bd;

                        border-radius:
                            10px;

                    }


                    .table-responsive::-webkit-scrollbar-thumb:hover {

                        background:
                            #6c757d;

                    }


                    .taluka-report-modal {

                        max-width:
                            1200px !important;

                        width:
                            calc(100% - 30px) !important;

                        margin:
                            15px auto !important;

                        height:
                            calc(100vh - 30px) !important;

                    }


                    .taluka-report-modal-content {

                        height:
                            100% !important;

                        max-height:
                            100% !important;

                        border-radius:
                            12px !important;

                        overflow:
                            hidden !important;

                    }


                    .taluka-modal-body {

                        flex:
                            1 1 auto !important;

                        min-height:
                            0 !important;

                        overflow-y:
                            auto !important;

                        overflow-x:
                            hidden !important;

                        padding:
                            24px !important;

                    }


                    .taluka-modal-body::-webkit-scrollbar {

                        width:
                            10px;

                    }


                    .taluka-modal-body::-webkit-scrollbar-track {

                        background:
                            #f1f1f1;

                        border-radius:
                            10px;

                    }


                    .taluka-modal-body::-webkit-scrollbar-thumb {

                        background:
                            #888;

                        border-radius:
                            10px;

                    }


                    .taluka-modal-body::-webkit-scrollbar-thumb:hover {

                        background:
                            #555;

                    }


                    @media (max-width: 768px) {

                        .taluka-report-modal {

                            width:
                                100% !important;

                            height:
                                100vh !important;

                            margin:
                                0 !important;

                        }


                        .taluka-report-modal-content {

                            border-radius:
                                0 !important;

                        }


                        .taluka-modal-body {

                            padding:
                                16px !important;

                        }


                        .navbar {

                            padding-left:
                                12px !important;

                            padding-right:
                                12px !important;

                        }

                    }

                `}</style>


            </div>

        </>

    );

};


export default TalukaDashboard;