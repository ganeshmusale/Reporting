import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Button,
    Form,
    Modal,
} from "react-bootstrap";

import * as XLSX from "xlsx";
import { API_BASE_URL } from "../../config/api";

// =====================================================
// EMPTY FORM
// =====================================================

const EMPTY_FORM = {
    head: "",
    mobileNumber: "",
    reportDate: "",
    designation: "",

    districtId: "",
    districtName: "",

    talukaId: "",
    taluka: "",

    vibhag: "",

    joiningDate: "",

    accountNumber: "",
    ifscCode: "",
    bankName: "",

    status: "active",

    email: "",
    userId: "",
    password: "",

    address: "",
};

const MAHARASHTRA_DISTRICTS = [
    "Ahmednagar", "Akola", "Amravati", "Chhatrapati Sambhajinagar", "Beed",
    "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli",
    "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur",
    "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded",
    "Nandurbar", "Nashik", "Dharashiv", "Palghar", "Parbhani",
    "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara",
    "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"
];

// =====================================================
// SAFE STRING
// =====================================================

const safeString = (value) => {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value);

};

// =====================================================
// GET ARRAY
// =====================================================

const getArrayFromResponse = (result) => {

    if (!result) {
        return [];
    }

    if (Array.isArray(result)) {
        return result;
    }

    if (Array.isArray(result?.data)) {
        return result.data;
    }

    if (
        Array.isArray(
            result?.data?.data
        )
    ) {
        return result.data.data;
    }

    if (
        Array.isArray(
            result?.vibhags
        )
    ) {
        return result.vibhags;
    }

    if (
        Array.isArray(
            result?.talukas
        )
    ) {
        return result.talukas;
    }

    if (
        Array.isArray(
            result?.districts
        )
    ) {
        return result.districts;
    }

    if (
        Array.isArray(
            result?.rows
        )
    ) {
        return result.rows;
    }

    return [];

};

// =====================================================
// COMPONENT
// =====================================================

const Vibhag = () => {

    // =================================================
    // STATES
    // =================================================

    const [vibhags, setVibhags] =
        useState([]);

    const [districts, setDistricts] =
        useState([]);

    const [talukas, setTalukas] =
        useState([]);

    const [allTalukas, setAllTalukas] =
        useState([]);

    const [showModal, setShowModal] =
        useState(false);

    const [editingId, setEditingId] =
        useState(null);

    const [showPassword, setShowPassword] =
        useState(false);

    const [
        visibleTablePasswords,
        setVisibleTablePasswords,
    ] = useState({});

    const [loading, setLoading] =
        useState(false);

    const [formLoading, setFormLoading] =
        useState(false);

    const [formData, setFormData] =
        useState({
            ...EMPTY_FORM,
        });

    // =================================================
    // SEARCH
    // =================================================

    const [vibhagIdSearch, setVibhagIdSearch] =
        useState("");

    const [nameSearch, setNameSearch] =
        useState("");

    const [userIdSearch, setUserIdSearch] =
        useState("");

    // =================================================
    // PAGINATION
    // =================================================

    const RECORDS_PER_PAGE = 20;

    const [currentPage, setCurrentPage] =
        useState(1);

    // =====================================================
    // FETCH VIBHAGS
    // =====================================================

    const fetchVibhags = async () => {

        try {

            setLoading(true);

            const response =
                await fetch(
                    `${API_BASE_URL}/vibhag`,
                    {
                        method: "GET",
                        headers: {
                            Accept:
                                "application/json",
                        },
                        cache: "no-store",
                    }
                );

            const result =
                await response.json();

            console.log(
                "VIBHAG RESPONSE:",
                result
            );

            if (!response.ok) {

                throw new Error(
                    result?.message ||
                    "Failed to fetch Vibhag data"
                );

            }

            const rows =
                getArrayFromResponse(
                    result
                );

            setVibhags(
                Array.isArray(rows)
                    ? rows
                    : []
            );

        } catch (error) {

            console.error(
                "VIBHAG FETCH ERROR:",
                error
            );

            setVibhags([]);

            alert(
                error.message ||
                "Failed to fetch Vibhag data"
            );

        } finally {

            setLoading(false);

        }

    };

    // =====================================================
    // FETCH DISTRICTS
    // =====================================================

    const fetchDistricts = async () => {

        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/district`,
                    {
                        method: "GET",
                        headers: {
                            Accept:
                                "application/json",
                        },
                        cache: "no-store",
                    }
                );

            const result =
                await response.json();

            console.log(
                "DISTRICT RESPONSE:",
                result
            );

            if (!response.ok) {

                throw new Error(
                    result?.message ||
                    "Failed to fetch districts"
                );

            }

            const rows =
                getArrayFromResponse(
                    result
                );

            const formatted =
                rows.map(
                    (district) => ({

                        ...district,

                        id:
                            district?.id ??
                            district?.district_id ??
                            district?.districtId ??
                            "",

                        name:
                            district?.district_name ||
                            district?.districtName ||
                            district?.name ||
                            "",

                        district_name:
                            district?.district_name ||
                            district?.districtName ||
                            district?.name ||
                            "",

                        head_name:
                            district?.name ||
                            "",

                    })
                );

            setDistricts(
                formatted
            );

            return formatted;

        } catch (error) {

            console.error(
                "DISTRICT FETCH ERROR:",
                error
            );

            setDistricts([]);

            alert(
                error.message ||
                "Failed to fetch districts"
            );

            return [];

        }

    };

    // =====================================================
    // FETCH TALUKAS BY DISTRICT
    // =====================================================

    const fetchTalukasByDistrict =
        async (
            districtId
        ) => {

            try {

                if (
                    !safeString(
                        districtId
                    ).trim()
                ) {

                    setTalukas([]);

                    return [];

                }

                const response =
                    await fetch(
                        `${API_BASE_URL}/taluka/district/${districtId}`,
                        {
                            method: "GET",
                            headers: {
                                Accept:
                                    "application/json",
                            },
                            cache: "no-store",
                        }
                    );

                const result =
                    await response.json();

                console.log(
                    "TALUKA RESPONSE:",
                    result
                );

                if (!response.ok) {

                    throw new Error(
                        result?.message ||
                        "Failed to fetch Talukas"
                    );

                }

                const rows =
                    getArrayFromResponse(
                        result
                    );

                const formatted =
                    rows.map(
                        (taluka) => ({

                            ...taluka,

                            id:
                                taluka?.id ??
                                taluka?.taluka_id ??
                                taluka?.talukaId ??
                                "",

                            name:
                                taluka?.taluka_name ||
                                taluka?.talukaName ||
                                taluka?.taluka ||
                                taluka?.name ||
                                "",

                            taluka_name:
                                taluka?.taluka_name ||
                                taluka?.talukaName ||
                                taluka?.taluka ||
                                taluka?.name ||
                                "",

                        })
                    );

                setTalukas(
                    formatted
                );

                return formatted;

            } catch (error) {

                console.error(
                    "TALUKA FETCH ERROR:",
                    error
                );

                setTalukas([]);

                alert(
                    error.message ||
                    "Failed to fetch Talukas"
                );

                return [];

            }

        };

    // =====================================================
    // FETCH ALL TALUKAS (for master table name lookup)
    // =====================================================

    const fetchAllTalukas = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/taluka`, {
                method: "GET",
                headers: { Accept: "application/json" },
                cache: "no-store",
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result?.message || "Failed to fetch Talukas");
            }
            const rows = getArrayFromResponse(result);
            setAllTalukas(
                rows.map((taluka) => ({
                    ...taluka,
                    id:
                        taluka?.id ??
                        taluka?.taluka_id ??
                        taluka?.talukaId ??
                        "",
                    taluka_name:
                        taluka?.taluka_name ||
                        taluka?.talukaName ||
                        taluka?.taluka ||
                        taluka?.name ||
                        "",
                }))
            );
        } catch (error) {
            console.error("ALL TALUKA FETCH ERROR:", error);
            setAllTalukas([]);
        }
    };

    // =====================================================
    // INITIAL LOAD
    // =====================================================

    useEffect(() => {

        fetchVibhags();
        fetchDistricts();
        fetchAllTalukas();

    }, []);

    // =====================================================
    // GET DISTRICT NAME
    // =====================================================

    const getDistrictName = (item) => {
        const val = item?.district_name || item?.districtName || item?.district;
        if (val && String(val).trim() && String(val).trim() !== "-") {
            return String(val).trim();
        }

        const district = districts.find(
            (d) => safeString(d?.id) === safeString(item?.district_id ?? item?.districtId)
        );

        // Prefer district_name over head name
        return district?.district_name || district?.districtName || "-";
    };

    // =====================================================
    // GET TALUKA NAME
    // =====================================================

    const getTalukaName = (item) => {
        const val = item?.taluka_name || item?.talukaName || item?.taluka;
        if (val && String(val).trim() && String(val).trim() !== "-") {
            return String(val).trim();
        }

        const talukaId = safeString(item?.taluka_id ?? item?.talukaId);
        const taluka =
            allTalukas.find((t) => safeString(t?.id) === talukaId) ||
            talukas.find((t) => safeString(t?.id) === talukaId);

        return taluka?.taluka_name || taluka?.talukaName || taluka?.taluka || "-";
    };

    // =====================================================
    // DATE FORMAT
    // =====================================================

    const formatDate = (
        date
    ) => {

        if (!date) {
            return "-";
        }

        const parsedDate =
            new Date(date);

        if (
            Number.isNaN(
                parsedDate.getTime()
            )
        ) {
            return safeString(
                date
            );
        }

        return parsedDate.toLocaleDateString(
            "en-GB"
        );

    };

    // =====================================================
    // INPUT DATE
    // =====================================================

    const getInputDate = (
        value
    ) => {

        if (!value) {
            return "";
        }

        const stringValue =
            safeString(value);

        if (
            /^\d{4}-\d{2}-\d{2}/.test(
                stringValue
            )
        ) {

            return stringValue.substring(
                0,
                10
            );

        }

        return "";

    };

    // =====================================================
    // FILTER
    // =====================================================

    const filteredVibhags =
        useMemo(() => {

            const idKeyword =
                safeString(
                    vibhagIdSearch
                )
                    .trim()
                    .toLowerCase();

            const nameKeyword =
                safeString(
                    nameSearch
                )
                    .trim()
                    .toLowerCase();

            const userKeyword =
                safeString(
                    userIdSearch
                )
                    .trim()
                    .toLowerCase();

            return vibhags.filter(
                (item) => {

                    const vibhagId =
                        `VH-${String(
                            item?.id ?? ""
                        ).padStart(
                            4,
                            "0"
                        )}`.toLowerCase();

                    const name =
                        safeString(
                            item?.head ??
                            item?.name ??
                            ""
                        ).toLowerCase();

                    const userId =
                        safeString(
                            item?.user_id ??
                            item?.userId ??
                            ""
                        ).toLowerCase();

                    return (

                        (
                            !idKeyword ||
                            vibhagId.includes(
                                idKeyword
                            )
                        )

                        &&

                        (
                            !nameKeyword ||
                            name.includes(
                                nameKeyword
                            )
                        )

                        &&

                        (
                            !userKeyword ||
                            userId.includes(
                                userKeyword
                            )
                        )

                    );

                }
            );

        }, [
            vibhags,
            vibhagIdSearch,
            nameSearch,
            userIdSearch,
        ]);

    // =====================================================
    // RESET PAGE
    // =====================================================

    useEffect(() => {

        setCurrentPage(1);

    }, [
        vibhagIdSearch,
        nameSearch,
        userIdSearch,
    ]);

    // =====================================================
    // PAGINATION
    // =====================================================

    const totalRecords =
        filteredVibhags.length;

    const totalPages =
        Math.ceil(
            totalRecords /
            RECORDS_PER_PAGE
        );

    const startIndex =
        (currentPage - 1) *
        RECORDS_PER_PAGE;

    const endIndex =
        startIndex +
        RECORDS_PER_PAGE;

    const currentVibhags =
        filteredVibhags.slice(
            startIndex,
            endIndex
        );

    // =====================================================
    // PAGE NUMBERS
    // =====================================================

    const getPageNumbers = () => {

        const pages = [];

        if (totalPages <= 7) {

            for (
                let i = 1;
                i <= totalPages;
                i++
            ) {
                pages.push(i);
            }

            return pages;

        }

        pages.push(1);

        if (currentPage > 4) {
            pages.push("...");
        }

        const start =
            Math.max(
                2,
                currentPage - 1
            );

        const end =
            Math.min(
                totalPages - 1,
                currentPage + 1
            );

        for (
            let i = start;
            i <= end;
            i++
        ) {
            pages.push(i);
        }

        if (
            currentPage <
            totalPages - 3
        ) {
            pages.push("...");
        }

        pages.push(totalPages);

        return pages;

    };

    // =====================================================
    // GO PAGE
    // =====================================================

    const goToPage = (
        page
    ) => {

        if (
            page < 1 ||
            page > totalPages
        ) {
            return;
        }

        setCurrentPage(page);

    };

    // =====================================================
    // CLEAR SEARCH
    // =====================================================

    const clearSearch = () => {

        setVibhagIdSearch("");
        setNameSearch("");
        setUserIdSearch("");

        setCurrentPage(1);

    };

    // =====================================================
    // HANDLE CHANGE
    // =====================================================

    const handleChange = (
        e
    ) => {

        const {
            name,
            value,
        } = e.target;

        if (
            name === "districtName" ||
            name === "districtId" ||
            name === "district"
        ) {

            const selectedDistrict =
                districts.find(
                    (district) =>
                        safeString(
                            district?.name
                        ).trim().toLowerCase() ===
                        safeString(
                            value
                        ).trim().toLowerCase() ||
                        safeString(
                            district?.id
                        ).trim() ===
                        safeString(
                            value
                        ).trim()
                );

            const districtName =
                selectedDistrict
                    ? (selectedDistrict?.name || selectedDistrict?.district_name || selectedDistrict?.districtName || value)
                    : value;

            const districtId =
                selectedDistrict
                    ? safeString(selectedDistrict.id)
                    : "";

            setFormData((prev) => ({
                ...prev,
                districtId,
                districtName,
                talukaId: "",
                taluka: "",
            }));

            fetchTalukasByDistrict(districtId);

            return;

        }

        // ===============================================
        // TALUKA
        // ===============================================

        if (name === "talukaId") {

            const selectedTaluka =
                talukas.find(
                    (taluka) =>
                        safeString(
                            taluka?.id
                        ) ===
                        safeString(
                            value
                        )
                );

            const talukaName =
                selectedTaluka?.name ||
                selectedTaluka?.taluka ||
                selectedTaluka?.taluka_name ||
                selectedTaluka?.talukaName ||
                "";

            setFormData(
                (prev) => ({

                    ...prev,

                    talukaId:
                        value,

                    taluka:
                        talukaName,

                })
            );

            return;

        }

        // ===============================================
        // NORMAL FIELDS
        // ===============================================

        setFormData(
            (prev) => ({

                ...prev,

                [name]:
                    value,

            })
        );

    };

    // =====================================================
    // NEXT VIBHAG ID
    // =====================================================

    const getNextVibhagId = () => {

        const ids =
            vibhags
                .map(
                    (item) =>
                        Number(
                            item?.id
                        )
                )
                .filter(
                    (id) =>
                        Number.isFinite(
                            id
                        ) &&
                        id > 0
                );

        const nextId =
            ids.length > 0
                ? Math.max(...ids) + 1
                : 1;

        return `VH-${String(
            nextId
        ).padStart(
            4,
            "0"
        )}`;

    };

    // =====================================================
    // OPEN ADD MODAL
    // =====================================================

    const openAddModal = async () => {

        setEditingId(null);

        setShowPassword(false);

        setFormData({
            ...EMPTY_FORM,

            reportDate:
                new Date()
                    .toISOString()
                    .split("T")[0],
        });

        await fetchDistricts();

        setTalukas([]);

        setShowModal(true);

    };

    // =====================================================
    // OPEN EDIT
    // =====================================================

    const openEditModal = async (
        item
    ) => {
        const resolvedDistrict = getDistrictName(item);
        const resolvedTaluka = getTalukaName(item);

        const districtId =
            item?.district_id ??
            item?.districtId ??
            "";

        const districtName =
            (item?.district_name && item?.district_name !== "-")
                ? item.district_name
                : (resolvedDistrict !== "-" ? resolvedDistrict : "");

        const talukaId =
            item?.taluka_id ??
            item?.talukaId ??
            "";

        const talukaName =
            (item?.taluka_name && item?.taluka_name !== "-")
                ? item.taluka_name
                : (item?.taluka && item?.taluka !== "-" ? item.taluka : (resolvedTaluka !== "-" ? resolvedTaluka : ""));

        setEditingId(
            item?.id
        );

        setShowPassword(false);

        setFormData({
            head:
                item?.head ||
                item?.name ||
                "",

            mobileNumber:
                item?.contact_number ||
                item?.contactNumber ||
                item?.mobile_number ||
                "",

            reportDate:
                getInputDate(
                    item?.report_date ||
                    item?.reportDate
                ),

            designation:
                item?.designation ||
                "",

            districtId:
                safeString(
                    districtId
                ),

            districtName:
                districtName,

            talukaId:
                safeString(
                    talukaId
                ),

            taluka:
                talukaName,

            vibhag:
                item?.vibhag ||
                "",

            joiningDate:
                getInputDate(
                    item?.joining_date ||
                    item?.joiningDate
                ),

            accountNumber:
                item?.account_no ||
                item?.accountNumber ||
                "",

            ifscCode:
                item?.ifsc_code ||
                item?.ifscCode ||
                "",

            bankName:
                item?.bank_name ||
                item?.bankName ||
                "",

            status:
                item?.status ||
                "active",

            email:
                item?.email ||
                "",

            userId:
                item?.user_id ||
                item?.userId ||
                "",

            password:
                item?.password ||
                "",

            address:
                item?.address ||
                "",

        });

        await fetchDistricts();

        if (
            safeString(
                districtId
            ).trim()
        ) {

            await fetchTalukasByDistrict(
                districtId
            );

        } else {

            setTalukas([]);

        }

        setShowModal(true);

    };

    // =====================================================
    // CLOSE MODAL
    // =====================================================

    const closeModal = () => {

        if (formLoading) {
            return;
        }

        setShowModal(false);

        setEditingId(null);

        setShowPassword(false);

        setFormData({
            ...EMPTY_FORM,
        });

        setTalukas([]);

    };

    // =====================================================
    // SUBMIT
    // =====================================================

    const handleSubmit = async (
        e
    ) => {

        e.preventDefault();

        const head =
            safeString(
                formData.head
            ).trim();

        const mobileNumber =
            safeString(
                formData.mobileNumber
            ).trim();

        const reportDate =
            safeString(
                formData.reportDate
            ).trim();

        const designation =
            safeString(
                formData.designation
            ).trim();

        const districtId =
            safeString(
                formData.districtId
            ).trim();

        const districtName =
            safeString(
                formData.districtName
            ).trim();

        const talukaId =
            safeString(
                formData.talukaId
            ).trim();

        const taluka =
            safeString(
                formData.taluka
            ).trim();

        const vibhag =
            safeString(
                formData.vibhag
            ).trim();

        const joiningDate =
            safeString(
                formData.joiningDate
            ).trim();

        const accountNumber =
            safeString(
                formData.accountNumber
            ).trim();

        const ifscCode =
            safeString(
                formData.ifscCode
            ).trim();

        const bankName =
            safeString(
                formData.bankName
            ).trim();

        const status =
            safeString(
                formData.status
            ).trim() ||
            "active";

        const email =
            safeString(
                formData.email
            ).trim();

        const userId =
            safeString(
                formData.userId
            ).trim();

        const password =
            safeString(
                formData.password
            ).trim();

        const address =
            safeString(
                formData.address
            ).trim();

        // ===============================================
        // VALIDATION
        // ===============================================

        if (!head) {

            alert(
                "Please enter Full Name"
            );

            return;

        }

        if (!mobileNumber) {

            alert(
                "Please enter Mobile Number"
            );

            return;

        }

        if (
            !/^[0-9]{10}$/.test(
                mobileNumber
            )
        ) {

            alert(
                "Mobile Number must contain 10 digits"
            );

            return;

        }

        const rawDistrict = (formData.districtName || districtName || "").trim();
        let finalDistrictId = formData.districtId || districtId;
        if (!finalDistrictId && rawDistrict) {
            const matched = districts.find(
                (d) =>
                    safeString(d?.name).trim().toLowerCase() === rawDistrict.toLowerCase() ||
                    safeString(d?.district_name).trim().toLowerCase() === rawDistrict.toLowerCase()
            );
            if (matched) {
                finalDistrictId = safeString(matched.id);
            }
        }

        const rawTaluka = (formData.taluka || taluka || "").trim();
        let finalTalukaId = formData.talukaId || talukaId;
        let finalTalukaName = rawTaluka;

        if (!finalTalukaId && finalDistrictId && rawTaluka) {
            const talukaRows = await fetchTalukasByDistrict(finalDistrictId);
            const matchedTaluka = talukaRows.find(
                (item) =>
                    safeString(item?.name || item?.taluka_name || item?.taluka)
                        .trim()
                        .toLowerCase() === rawTaluka.toLowerCase()
            );

            if (matchedTaluka) {
                finalTalukaId = safeString(matchedTaluka.id);
                finalTalukaName = matchedTaluka.name || matchedTaluka.taluka_name || matchedTaluka.taluka;
            }
        }

        if (!rawDistrict) {
            alert(
                "Please enter District"
            );
            return;
        }

        if (!rawTaluka) {
            alert(
                "Please enter Taluka"
            );
            return;
        }

        if (!vibhag) {

            alert(
                "Please enter Vibhag Name"
            );

            return;

        }

        if (!userId) {

            alert(
                "Please enter User ID"
            );

            return;

        }

        if (
            !editingId &&
            !password
        ) {

            alert(
                "Please enter Password"
            );

            return;

        }

        // ===============================================
        // PAYLOAD
        // ===============================================

        const autoVibhagCode = editingId ? `VH-${String(editingId).padStart(4, "0")}` : getNextVibhagId();

        const payload = {

            vibhag_code:
                autoVibhagCode,

            head,

            mobile_number:
                mobileNumber,

            contact_number:
                mobileNumber,

            designation,

            district_id:
                finalDistrictId ? Number(finalDistrictId) : null,

            district_name:
                rawDistrict,

            district:
                rawDistrict,

            taluka_id:
                finalTalukaId ? Number(finalTalukaId) : null,

            taluka: finalTalukaName || rawTaluka,
            taluka_name:
                finalTalukaName || rawTaluka,

            vibhag:
                vibhag || head || autoVibhagCode,

            joining_date:
                joiningDate || null,

            status,

            account_no:
                accountNumber || null,

            account_number:
                accountNumber || null,

            ifsc_code:
                ifscCode || null,

            bank_name:
                bankName || null,

            user_id:
                userId,

            password:
                password || undefined,

            email:
                email || null,

            address:
                address || null,

        };

        console.log(
            "VIBHAG PAYLOAD:",
            payload
        );

        try {

            setFormLoading(true);

            const url =
                editingId
                    ? `${API_BASE_URL}/vibhag/${editingId}`
                    : `${API_BASE_URL}/vibhag`;

            const method =
                editingId
                    ? "PUT"
                    : "POST";

            const response =
                await fetch(
                    url,
                    {
                        method,

                        headers: {

                            "Content-Type":
                                "application/json",

                            Accept:
                                "application/json",

                        },

                        body:
                            JSON.stringify(
                                payload
                            ),

                    }
                );

            const result =
                await response.json();

            console.log(
                "VIBHAG SAVE RESPONSE:",
                result
            );

            if (!response.ok) {

                throw new Error(
                    result?.message ||
                    (
                        editingId
                            ? "Failed to update Vibhag"
                            : "Failed to add Vibhag"
                    )
                );

            }

            if (
                result?.success === false
            ) {

                throw new Error(
                    result?.message ||
                    "Operation failed"
                );

            }

            alert(
                result?.message ||
                (
                    editingId
                        ? "Vibhag updated successfully"
                        : "Vibhag added successfully"
                )
            );

            await fetchVibhags();

            closeModal();

        } catch (error) {

            console.error(
                "VIBHAG SAVE ERROR:",
                error
            );

            alert(
                error.message ||
                "Failed to save Vibhag"
            );

        } finally {

            setFormLoading(false);

        }

    };

    // =====================================================
    // DELETE
    // =====================================================

    const handleDelete = async (
        id
    ) => {

        const confirmDelete =
            window.confirm(
                "Are you sure you want to delete this Vibhag?"
            );

        if (!confirmDelete) {
            return;
        }

        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/vibhag/${id}`,
                    {
                        method: "DELETE",

                        headers: {
                            Accept:
                                "application/json",
                        },
                    }
                );

            const result =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    result?.message ||
                    "Failed to delete Vibhag"
                );

            }

            if (
                result?.success === false
            ) {

                throw new Error(
                    result?.message ||
                    "Failed to delete Vibhag"
                );

            }

            alert(
                result?.message ||
                "Vibhag deleted successfully"
            );

            await fetchVibhags();

        } catch (error) {

            console.error(
                "DELETE ERROR:",
                error
            );

            alert(
                error.message ||
                "Failed to delete Vibhag"
            );

        }

    };

    // =====================================================
    // PASSWORD TOGGLE
    // =====================================================

    const toggleTablePassword = (
        id
    ) => {

        setVisibleTablePasswords(
            (prev) => ({

                ...prev,

                [id]:
                    !prev[id],

            })
        );

    };

    // =====================================================
    // DOWNLOAD EXCEL
    // =====================================================

    const handleDownloadExcel = () => {

        try {

            if (
                filteredVibhags.length === 0
            ) {

                alert(
                    "No Vibhag records available to download."
                );

                return;

            }

            const excelData =
                filteredVibhags.map(
                    (
                        item,
                        index
                    ) => ({

                        SR:
                            index + 1,

                        "Vibhag ID":
                            `VH-${String(
                                item?.id ?? ""
                            ).padStart(
                                4,
                                "0"
                            )}`,

                        "Full Name":
                            item?.head ||
                            item?.name ||
                            "",

                        "Mobile Number":
                            item?.contact_number ||
                            item?.contactNumber ||
                            item?.mobile_number ||
                            "",

                        Designation:
                            item?.designation ||
                            "",

                        District:
                            getDistrictName(
                                item
                            ),

                        Taluka:
                            getTalukaName(
                                item
                            ),

                        "Joining Date":
                            formatDate(
                                item?.joining_date ||
                                item?.joiningDate
                            ),

                        Status:
                            item?.status ||
                            "active",

                        "Account Number":
                            item?.account_no ||
                            item?.account_number ||
                            item?.accountNumber ||
                            "",

                        "IFSC Code":
                            item?.ifsc_code ||
                            item?.ifscCode ||
                            "",

                        "Bank Name":
                            item?.bank_name ||
                            item?.bankName ||
                            "",

                        "User ID":
                            item?.user_id ||
                            item?.userId ||
                            "",

                        Password:
                            item?.password ||
                            "",

                    })
                );

            const worksheet =
                XLSX.utils.json_to_sheet(
                    excelData
                );

            worksheet["!cols"] = [

                { wch: 8 },
                { wch: 15 },
                { wch: 25 },
                { wch: 18 },
                { wch: 20 },
                { wch: 25 },
                { wch: 25 },
                { wch: 15 },
                { wch: 12 },
                { wch: 20 },
                { wch: 18 },
                { wch: 22 },
                { wch: 20 },
                { wch: 20 },

            ];

            const workbook =
                XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "Vibhag Report"
            );

            const today =
                new Date()
                    .toISOString()
                    .split("T")[0];

            XLSX.writeFile(
                workbook,
                `Vibhag_Report_${today}.xlsx`
            );

        } catch (error) {

            console.error(
                "EXCEL ERROR:",
                error
            );

            alert(
                "Unable to download Vibhag Excel file."
            );

        }

    };

    // =====================================================
    // JSX
    // =====================================================

    return (

        <div
            className="container-fluid px-0"
            style={{
                maxWidth: "100%",
                overflowX: "hidden",
            }}
        >

            {/* HEADER */}

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
                        Vibhag
                    </h3>

                    <p className="text-muted mb-0">
                        Manage Vibhag records
                    </p>

                </div>

                <Button
                    variant="dark"
                    onClick={
                        openAddModal
                    }
                    disabled={
                        formLoading
                    }
                >

                    <span
                        className="fw-bold me-2"
                        style={{
                            fontSize: "18px",
                        }}
                    >
                        +
                    </span>

                    Add Vibhag

                </Button>

            </div>

            {/* COUNTER */}

            <div
                className="
                    card
                    border-0
                    shadow-sm
                    mb-4
                "
            >

                <div
                    className="card-body"
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
                                width: "52px",
                                height: "52px",
                                fontSize: "18px",
                            }}
                        >
                            {totalRecords}
                        </div>

                        <div>

                            <small className="text-muted">
                                Total Vibhag
                            </small>

                            <h4 className="fw-bold mb-0">
                                {totalRecords}
                            </h4>

                        </div>

                    </div>

                </div>

            </div>

            {/* SEARCH */}

            <div
                className="
                    card
                    border-0
                    shadow-sm
                    mb-4
                "
            >

                <div
                    className="card-body"
                >

                    <div
                        className="
                            row
                            g-3
                            align-items-end
                        "
                    >

                        <div
                            className="
                                col-12
                                col-md-3
                            "
                        >

                            <Form.Label
                                className="fw-semibold"
                            >
                                Vibhag ID
                            </Form.Label>

                            <Form.Control
                                type="text"
                                placeholder="Search Vibhag ID..."
                                value={
                                    vibhagIdSearch
                                }
                                onChange={(e) =>
                                    setVibhagIdSearch(
                                        e.target.value
                                    )
                                }
                            />

                        </div>

                        <div
                            className="
                                col-12
                                col-md-3
                            "
                        >

                            <Form.Label
                                className="fw-semibold"
                            >
                                Name
                            </Form.Label>

                            <Form.Control
                                type="text"
                                placeholder="Search Name..."
                                value={
                                    nameSearch
                                }
                                onChange={(e) =>
                                    setNameSearch(
                                        e.target.value
                                    )
                                }
                            />

                        </div>

                        <div
                            className="
                                col-12
                                col-md-3
                            "
                        >

                            <Form.Label
                                className="fw-semibold"
                            >
                                User ID
                            </Form.Label>

                            <Form.Control
                                type="text"
                                placeholder="Search User ID..."
                                value={
                                    userIdSearch
                                }
                                onChange={(e) =>
                                    setUserIdSearch(
                                        e.target.value
                                    )
                                }
                            />

                        </div>

                        <div
                            className="
                                col-12
                                col-md-3
                            "
                        >

                            <Button
                                variant="outline-secondary"
                                className="w-100"
                                onClick={
                                    clearSearch
                                }
                            >
                                Clear
                            </Button>

                        </div>

                    </div>

                </div>

            </div>

            {/* TABLE */}

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

                            <h6 className="fw-bold mb-0">
                                Vibhag List
                            </h6>

                            <small className="text-muted">

                                Showing{" "}

                                <strong>
                                    {
                                        totalRecords === 0
                                            ? 0
                                            : startIndex + 1
                                    }
                                </strong>

                                {" - "}

                                <strong>
                                    {Math.min(
                                        endIndex,
                                        totalRecords
                                    )}
                                </strong>

                                {" "}of{" "}

                                <strong>
                                    {totalRecords}
                                </strong>

                                {" "}records

                            </small>

                        </div>

                        <Button
                            type="button"
                            variant="success"
                            size="sm"
                            onClick={
                                handleDownloadExcel
                            }
                            disabled={
                                loading ||
                                filteredVibhags.length ===
                                    0
                            }
                        >
                            ↓&nbsp; Download Excel
                        </Button>

                    </div>

                </div>

                <div
                    className="card-body p-0"
                >

                    <div
                        className="table-responsive"
                    >

                        <table
                            className="
                                table
                                table-hover
                                table-bordered
                                align-middle
                                mb-0
                            "
                        >

                            <thead
                                className="table-light"
                            >

                                <tr>

                                    <th>
                                        SR
                                    </th>

                                    <th>
                                        Vibhag ID
                                    </th>

                                    <th>
                                        Full Name
                                    </th>

                                    <th>
                                        Mobile Number
                                    </th>

                                    <th>
                                        Designation
                                    </th>

                                    <th>
                                        District
                                    </th>

                                    <th>
                                        Taluka
                                    </th>

                                    <th>
                                        Joining Date
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Account Number
                                    </th>

                                    <th>
                                        IFSC Code
                                    </th>

                                    <th>
                                        Bank Name
                                    </th>

                                    <th>
                                        User ID
                                    </th>

                                    <th>
                                        Password
                                    </th>

                                    <th>
                                        Action
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {loading && (

                                    <tr>

                                        <td
                                            colSpan="15"
                                            className="
                                                text-center
                                                py-5
                                            "
                                        >
                                            Loading Vibhag data...
                                        </td>

                                    </tr>

                                )}

                                {!loading &&
                                    currentVibhags.length ===
                                        0 && (

                                        <tr>

                                            <td
                                                colSpan="15"
                                                className="
                                                    text-center
                                                    py-5
                                                    text-muted
                                                "
                                            >
                                                No Vibhag Found
                                            </td>

                                        </tr>

                                    )}

                                {!loading &&
                                    currentVibhags.map(
                                        (
                                            item,
                                            index
                                        ) => (

                                            <tr
                                                key={
                                                    item?.id ??
                                                    index
                                                }
                                            >

                                                <td>
                                                    {
                                                        startIndex +
                                                        index +
                                                        1
                                                    }
                                                </td>

                                                <td>
                                                    <span className="badge bg-light text-dark border">
                                                        {item?.vibhag_code || `VH-${String(item?.id ?? "").padStart(4, "0")}`}
                                                    </span>
                                                </td>

                                                <td
                                                    className="fw-semibold"
                                                >
                                                    {
                                                        item?.head ||
                                                        item?.name ||
                                                        "-"
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        item?.contact_number ||
                                                        item?.contactNumber ||
                                                        item?.mobile_number ||
                                                        "-"
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        item?.designation ||
                                                        "-"
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        getDistrictName(
                                                            item
                                                        )
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        getTalukaName(
                                                            item
                                                        )
                                                    }
                                                </td>

                                                <td>
                                                    {formatDate(
                                                        item?.joining_date ||
                                                        item?.joiningDate
                                                    )}
                                                </td>

                                                <td>

                                                    <span
                                                        className="
                                                            badge
                                                            bg-success-subtle
                                                            text-success
                                                        "
                                                    >
                                                        {
                                                            item?.status ||
                                                            "active"
                                                        }
                                                    </span>

                                                </td>

                                                <td>
                                                    {
                                                        item?.account_no ||
                                                        item?.account_number ||
                                                        item?.accountNumber ||
                                                        "-"
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        item?.ifsc_code ||
                                                        item?.ifscCode ||
                                                        "-"
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        item?.bank_name ||
                                                        item?.bankName ||
                                                        "-"
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        item?.user_id ||
                                                        item?.userId ||
                                                        "-"
                                                    }
                                                </td>

                                                <td>

                                                    {item?.password ? (

                                                        <div
                                                            className="
                                                                d-flex
                                                                align-items-center
                                                                gap-2
                                                            "
                                                        >

                                                            <span>
                                                                {
                                                                    visibleTablePasswords[
                                                                        item?.id
                                                                    ]
                                                                        ? item.password
                                                                        : "••••••••"
                                                                }
                                                            </span>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    toggleTablePassword(
                                                                        item?.id
                                                                    )
                                                                }
                                                                style={{
                                                                    border:
                                                                        "none",
                                                                    background:
                                                                        "transparent",
                                                                    cursor:
                                                                        "pointer",
                                                                    fontSize:
                                                                        "16px",
                                                                }}
                                                            >
                                                                {
                                                                    visibleTablePasswords[
                                                                        item?.id
                                                                    ]
                                                                        ? "🙈"
                                                                        : "👁️"
                                                                }
                                                            </button>

                                                        </div>

                                                    ) : (

                                                        "-"

                                                    )}

                                                </td>

                                                <td>

                                                    <div
                                                        className="
                                                            d-flex
                                                            gap-2
                                                        "
                                                    >

                                                        <Button
                                                            size="sm"
                                                            variant="outline-primary"
                                                            onClick={() =>
                                                                openEditModal(
                                                                    item
                                                                )
                                                            }
                                                        >
                                                            Edit
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="outline-danger"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    item?.id
                                                                )
                                                            }
                                                        >
                                                            Delete
                                                        </Button>

                                                    </div>

                                                </td>

                                            </tr>

                                        )
                                    )}

                            </tbody>

                        </table>

                    </div>

                </div>

                {/* PAGINATION */}

                {!loading &&
                    totalPages > 1 && (

                        <div
                            className="
                                card-footer
                                bg-white
                                py-3
                            "
                        >

                            <div
                                className="
                                    d-flex
                                    justify-content-between
                                    align-items-center
                                "
                            >

                                <small>
                                    Page{" "}
                                    <strong>
                                        {currentPage}
                                    </strong>
                                    {" "}of{" "}
                                    <strong>
                                        {totalPages}
                                    </strong>
                                </small>

                                <div
                                    className="d-flex gap-1"
                                >

                                    <button
                                        className="btn btn-sm btn-outline-secondary"
                                        disabled={
                                            currentPage ===
                                            1
                                        }
                                        onClick={() =>
                                            goToPage(
                                                currentPage -
                                                1
                                            )
                                        }
                                    >
                                        Previous
                                    </button>

                                    {getPageNumbers().map(
                                        (
                                            page,
                                            index
                                        ) => (

                                            page ===
                                            "..." ? (

                                                <span
                                                    key={
                                                        index
                                                    }
                                                    className="
                                                        btn
                                                        btn-sm
                                                        btn-light
                                                    "
                                                >
                                                    ...
                                                </span>

                                            ) : (

                                                <button
                                                    key={
                                                        page
                                                    }
                                                    className={`
                                                        btn
                                                        btn-sm
                                                        ${
                                                            currentPage ===
                                                            page
                                                                ? "btn-dark"
                                                                : "btn-outline-secondary"
                                                        }
                                                    `}
                                                    onClick={() =>
                                                        goToPage(
                                                            page
                                                        )
                                                    }
                                                >
                                                    {page}
                                                </button>

                                            )

                                        )
                                    )}

                                    <button
                                        className="btn btn-sm btn-outline-secondary"
                                        disabled={
                                            currentPage ===
                                            totalPages
                                        }
                                        onClick={() =>
                                            goToPage(
                                                currentPage +
                                                1
                                            )
                                        }
                                    >
                                        Next
                                    </button>

                                </div>

                            </div>

                        </div>

                    )}

            </div>

            {/* =================================================
                ADD / EDIT VIBHAG MODAL
            ================================================= */}

            <Modal
                show={
                    showModal
                }
                onHide={
                    closeModal
                }
                centered
                size="lg"
                backdrop="static"
            >

                <Form
                    onSubmit={
                        handleSubmit
                    }
                >

                    <Modal.Header closeButton>
                        <Modal.Title className="fw-bold">
                            {editingId ? "Edit Vibhag (विभाग संपादित करा)" : "Add Vibhag (विभाग जोडा)"}
                        </Modal.Title>
                    </Modal.Header>

                    <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
                        <div className="row g-3">

                            {/* VIBHAG ID */}
                            <div className="col-md-6">
                                <Form.Label className="fw-semibold">Vibhag ID (विभाग क्रमांक)</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={editingId ? `VH-${String(editingId).padStart(4, "0")}` : getNextVibhagId()}
                                    readOnly
                                    disabled={formLoading}
                                />
                            </div>

                            {/* FULL NAME */}
                            <div className="col-md-6">
                                <Form.Label className="fw-semibold">Full Name (पूर्ण नाव)</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="head"
                                    value={formData.head}
                                    onChange={handleChange}
                                    placeholder="पूर्ण नाव प्रविष्ट करा"
                                    disabled={formLoading}
                                />
                            </div>

                            {/* VIBHAG NAME */}
                            <div className="col-md-6">
                                <Form.Label className="fw-semibold">Vibhag Name (विभागाचे नाव)</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="vibhag"
                                    value={formData.vibhag}
                                    onChange={handleChange}
                                    placeholder="विभागाचे नाव प्रविष्ट करा"
                                    disabled={formLoading}
                                />
                            </div>

                            {/* MOBILE */}
                            <div className="col-md-6">
                                <Form.Label className="fw-semibold">Mobile Number (मोबाईल क्रमांक)</Form.Label>
                                <Form.Control
                                    type="tel"
                                    name="mobileNumber"
                                    value={formData.mobileNumber}
                                    onChange={handleChange}
                                    placeholder="१० अंकी मोबाईल क्रमांक"
                                    maxLength="10"
                                    disabled={formLoading}
                                />
                            </div>

                            {/* DESIGNATION */}
                            <div className="col-md-6">
                                <Form.Label className="fw-semibold">Designation (पद)</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="designation"
                                    value={formData.designation}
                                    onChange={handleChange}
                                    placeholder="पद प्रविष्ट करा"
                                    disabled={formLoading}
                                />
                            </div>

                            {/* DISTRICT */}
                            <div className="col-md-6">
                                <Form.Label className="fw-semibold">District (जिल्हा)</Form.Label>
                                <Form.Control
                                    type="text"
                                    list="vibhagDistrictDatalist"
                                    name="districtName"
                                    value={safeString(formData.districtName)}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const matched = districts.find(
                                            (d) => safeString(d?.name).trim().toLowerCase() === val.trim().toLowerCase() ||
                                                   safeString(d?.district_name).trim().toLowerCase() === val.trim().toLowerCase()
                                        );
                                        const newDistrictId = matched ? safeString(matched.id) : "";
                                        setFormData((prev) => ({
                                            ...prev,
                                            districtName: val,
                                            districtId: newDistrictId,
                                        }));
                                        if (newDistrictId) {
                                            fetchTalukasByDistrict(newDistrictId);
                                        }
                                    }}
                                    placeholder="जिल्हा निवडा किंवा टाईप करा"
                                    disabled={formLoading}
                                />
                                <datalist id="vibhagDistrictDatalist">
                                    {MAHARASHTRA_DISTRICTS.map((d) => (
                                        <option key={d} value={d} />
                                    ))}
                                    {districts.map((item) => (
                                        <option key={`db-${item.id}`} value={item.name || item.district_name || item.districtName} />
                                    ))}
                                </datalist>
                            </div>

                            {/* TALUKA */}
                            <div className="col-md-6">
                                <Form.Label className="fw-semibold">Taluka (तालुका)</Form.Label>
                                <Form.Control
                                    type="text"
                                    list="vibhagTalukaDatalist"
                                    name="taluka"
                                    value={safeString(formData.taluka)}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const matched = talukas.find(
                                            (t) => safeString(t?.name).trim().toLowerCase() === val.trim().toLowerCase() ||
                                                   safeString(t?.taluka_name).trim().toLowerCase() === val.trim().toLowerCase() ||
                                                   safeString(t?.taluka).trim().toLowerCase() === val.trim().toLowerCase()
                                        );
                                        setFormData((prev) => ({
                                            ...prev,
                                            taluka: val,
                                            talukaId: matched ? safeString(matched.id) : "",
                                        }));
                                    }}
                                    placeholder="तालुका निवडा किंवा टाईप करा"
                                    disabled={formLoading}
                                />
                                <datalist id="vibhagTalukaDatalist">
                                    {talukas.map((item) => (
                                        <option key={item.id} value={item.name || item.taluka_name || item.taluka} />
                                    ))}
                                </datalist>
                            </div>

                            {/* JOINING DATE */}
                            <div className="col-md-6">
                                <Form.Label className="fw-semibold">Joining Date (रुजू तारीख)</Form.Label>
                                <Form.Control
                                    type="date"
                                    name="joiningDate"
                                    value={formData.joiningDate}
                                    onChange={handleChange}
                                    disabled={formLoading}
                                />
                            </div>

                            {/* ACCOUNT */}
                            <div className="col-md-6">
                                <Form.Label className="fw-semibold">Account No. (खाते क्रमांक)</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="accountNumber"
                                    value={formData.accountNumber}
                                    onChange={handleChange}
                                    placeholder="बँक खाते क्रमांक"
                                    disabled={formLoading}
                                />
                            </div>

                            {/* IFSC */}
                            <div className="col-md-6">
                                <Form.Label className="fw-semibold">IFSC Code (आयएफएससी कोड)</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="ifscCode"
                                    value={formData.ifscCode}
                                    onChange={handleChange}
                                    placeholder="IFSC कोड प्रविष्ट करा"
                                    disabled={formLoading}
                                />
                            </div>

                            {/* BANK */}
                            <div className="col-md-6">
                                <Form.Label className="fw-semibold">Bank Name (बँकेचे नाव)</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="bankName"
                                    value={formData.bankName}
                                    onChange={handleChange}
                                    placeholder="बँकेचे नाव प्रविष्ट करा"
                                    disabled={formLoading}
                                />
                            </div>

                            {/* STATUS */}
                            <div className="col-md-6">
                                <Form.Label className="fw-semibold">Status (स्थिती)</Form.Label>
                                <Form.Select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    disabled={formLoading}
                                >
                                    <option value="active">Active (सक्रिय)</option>
                                    <option value="inactive">Inactive (निष्क्रिय)</option>
                                </Form.Select>
                            </div>



                            {/* USER ID */}
                            <div className="col-md-6">
                                <Form.Label className="fw-semibold">User ID (वापरकर्ता आयडी)</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="userId"
                                    value={formData.userId}
                                    onChange={handleChange}
                                    placeholder="वापरकर्ता आयडी प्रविष्ट करा"
                                    disabled={formLoading}
                                />
                            </div>

                            {/* PASSWORD */}
                            <div className="col-md-6">
                                <Form.Label className="fw-semibold">Password (पासवर्ड)</Form.Label>
                                <div style={{ position: "relative" }}>
                                    <Form.Control
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="पासवर्ड प्रविष्ट करा"
                                        disabled={formLoading}
                                        style={{ paddingRight: "45px" }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        disabled={formLoading}
                                        style={{
                                            position: "absolute",
                                            right: "10px",
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            border: "none",
                                            background: "transparent",
                                            cursor: "pointer",
                                            fontSize: "16px",
                                        }}
                                    >
                                        {showPassword ? "🙈" : "👁️"}
                                    </button>
                                </div>
                            </div>



                        </div>
                    </Modal.Body>

                    <Modal.Footer>
                        <Button variant="secondary" type="button" onClick={closeModal} disabled={formLoading}>
                            Cancel (रद्द करा)
                        </Button>
                        <Button variant="dark" type="submit" disabled={formLoading}>
                            {formLoading
                                ? (editingId ? "Updating..." : "Adding...")
                                : (editingId ? "Update Vibhag (अद्यतनित करा)" : "Add Vibhag (जोडा)")}
                        </Button>
                    </Modal.Footer>

                </Form>

            </Modal>

            {/* CSS */}

            <style>{`

                .table-responsive {
                    width: 100%;
                    max-width: 100%;
                    overflow-x: auto !important;
                    overflow-y: hidden;
                    -webkit-overflow-scrolling: touch;
                }

                .table {
                    min-width: 1900px;
                }

                .table th,
                .table td {
                    white-space: nowrap;
                    font-size: 12px;
                    padding: 10px 12px;
                    vertical-align: middle;
                }

                .table thead th {
                    font-weight: 700;
                    background: #f8f9fa;
                    line-height: 1.35;
                }

                .table tbody tr:hover {
                    background-color: #f8f9fa;
                }

                .table-responsive::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
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

                .pagination {
                    gap: 3px;
                }

                @media (max-width: 768px) {

                    .table th,
                    .table td {
                        font-size: 11px;
                        padding: 8px;
                    }

                }

            `}</style>

        </div>

    );

};

export default Vibhag;